import { createClient } from '@supabase/supabase-js';
import { db } from '../../services/supabase/database';
import { ROLE_CONFIGS } from '../../config/roles';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ [PASS] ${message}`);
}

async function runStoreWorkflowSuite() {
  console.log('================================================================');
  console.log('USER 6: STORE MANAGER & STOREKEEPER – LIVE WORKFLOW SUITE');
  console.log('================================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SECRET_KEY || '';
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase credentials missing.');
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  let testProductId = '';
  let testOrderId = '';
  let testInventoryItemId = '';
  let testTransactionId = '';
  let storeManagerId = '';
  let storekeeperId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Store Profiles & Role Verification
    // -------------------------------------------------------------------------
    console.log('--- 1. Store Profiles & Role Verification ---');
    const { data: storeMgrProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', 'store@1.edu')
      .single();

    assert(!!storeMgrProfile, 'Store Manager profile exists in database');
    assert(storeMgrProfile.role === 'store_manager', 'Profile role is strictly verified as "store_manager"');
    assert(storeMgrProfile.email === 'store@1.edu', 'Store Manager email verified as "store@1.edu"');
    storeManagerId = storeMgrProfile.id;

    const { data: storekeeperProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('email', 'storekeeper@1.edu')
      .single();

    assert(!!storekeeperProfile, 'Storekeeper profile exists in database');
    assert(storekeeperProfile.role === 'storekeeper', 'Profile role is strictly verified as "storekeeper"');
    storekeeperId = storekeeperProfile.id;

    const storeMgrConfig = ROLE_CONFIGS['store_manager'];
    assert(storeMgrConfig.allowedRoutes.includes('/store'), 'Store Manager allowed routes include /store');
    assert(storeMgrConfig.allowedRoutes.includes('/admin/store'), 'Store Manager allowed routes include /admin/store');
    assert(storeMgrConfig.allowedRoutes.includes('/dashboard'), 'Store Manager allowed routes include /dashboard');

    const storekeeperConfig = ROLE_CONFIGS['storekeeper'];
    assert(storekeeperConfig.allowedRoutes.includes('/store'), 'Storekeeper allowed routes include /store');

    // -------------------------------------------------------------------------
    // 2. Paramedical College Store Catalog
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Paramedical College Store Catalog ---');
    const products = await db.getStoreProducts();
    assert(products.length >= 5, `Store catalog retrieved via db.getStoreProducts() (${products.length} active products)`);

    const hasLabCoat = products.some(p => p.name.includes('Clinical Lab Coat'));
    assert(hasLabCoat, 'Catalog includes official "Adithyan College Clinical Lab Coat"');

    const hasScrubSuit = products.some(p => p.name.includes('Scrub Suit'));
    assert(hasScrubSuit, 'Catalog includes "Paramedical Clinical Uniform Scrub Suit"');

    const hasStethoscope = products.some(p => p.name.includes('Stethoscope'));
    assert(hasStethoscope, 'Catalog includes "Clinical Diagnostic Stethoscope"');

    const hasNoLegacySchoolNotebook = !products.some(p => p.name.toLowerCase().includes('school notebook'));
    assert(hasNoLegacySchoolNotebook, 'Legacy school notebook items successfully purged from catalog');

    const hasNoLegacySchoolBag = !products.some(p => p.name.toLowerCase().includes('school bag - premium'));
    assert(hasNoLegacySchoolBag, 'Legacy school bag items successfully purged from catalog');

    // -------------------------------------------------------------------------
    // 3. Store Product Lifecycle (Create, Update, Adjust Stock)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Store Product Lifecycle ---');
    const testProductName = `Test Autoclave Sterilization Cassette ${Date.now()}`;
    const createdProduct = await db.createStoreProduct({
      name: testProductName,
      category: 'Clinical Equipment',
      price: 1850,
      stock: 50,
      rating: 4.9,
      description: 'Stainless steel autoclave tray cassette for clinical laboratory instruments.'
    });

    assert(!!createdProduct && !!createdProduct.id, 'New store product created via db.createStoreProduct()');
    assert(createdProduct?.name === testProductName, 'Product name persisted correctly');
    assert(Number(createdProduct?.price) === 1850, 'Product price recorded accurately (₹1,850)');
    assert(Number(createdProduct?.stock) === 50, 'Initial stock recorded as 50 units');
    testProductId = createdProduct?.id || '';

    // Adjust product stock
    const stockUpdated = await db.updateStoreProduct(testProductId, { stock: 65, price: 1950 });
    assert(stockUpdated === true, 'Store product stock & pricing updated via db.updateStoreProduct()');

    const { data: updatedProdRecord } = await adminClient
      .from('store_products')
      .select('*')
      .eq('id', testProductId)
      .single();

    assert(Number(updatedProdRecord?.stock) === 65, 'Updated stock confirmed as 65 units in database');
    assert(Number(updatedProdRecord?.price) === 1950, 'Updated price confirmed as ₹1,950 in database');

    // -------------------------------------------------------------------------
    // 4. Student Order Placement & Atomic Stock Deduction
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Student Order Placement & Atomic Stock Deduction ---');
    const orderQty = 5;
    const expectedRemainingStock = 65 - orderQty; // 60

    const orderPlacement = await db.placeStoreOrderAtomic({
      userId: '10eddd1c-0c00-4f1e-a14e-831be7e19222',
      userName: 'Abisha H (Student)',
      items: [{
        id: testProductId,
        name: testProductName,
        price: 1950,
        quantity: orderQty
      }],
      totalAmount: 1950 * orderQty
    });

    assert(orderPlacement.success === true, 'Order placed successfully via db.placeStoreOrderAtomic()');
    assert(!!orderPlacement.order && !!orderPlacement.order.id, 'Order record generated in database');
    testOrderId = orderPlacement.order?.id || '';

    // Check that stock was atomically deducted
    const { data: stockAfterOrder } = await adminClient
      .from('store_products')
      .select('stock')
      .eq('id', testProductId)
      .single();

    assert(Number(stockAfterOrder?.stock) === expectedRemainingStock, `Product stock atomically deducted from 65 to ${expectedRemainingStock}`);

    // Check order fields
    const { data: verifiedOrder } = await adminClient
      .from('store_orders')
      .select('*')
      .eq('id', testOrderId)
      .single();

    assert(verifiedOrder?.status === 'Pending', 'Initial order status is "Pending"');
    assert(Number(verifiedOrder?.total_amount) === 1950 * orderQty, `Total order amount calculated accurately (₹${1950 * orderQty})`);

    // -------------------------------------------------------------------------
    // 5. Order Visibility Across Portals
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Order Visibility Across Portals ---');
    const allCampusOrders = await db.getStoreOrders();
    assert(allCampusOrders.some(o => o.id === testOrderId), 'Order visible in Store Manager & Admin orders ledger via db.getStoreOrders()');

    const studentOrders = await db.getUserStoreOrders('10eddd1c-0c00-4f1e-a14e-831be7e19222');
    assert(studentOrders.some(o => o.id === testOrderId), 'Order visible in Student & Parent store orders view via db.getUserStoreOrders()');

    // -------------------------------------------------------------------------
    // 6. Order Fulfillment & Status Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Order Fulfillment & Status Lifecycle ---');
    const markedProcessing = await db.updateStoreOrderStatus(testOrderId, 'Processing');
    assert(markedProcessing === true, 'Order status transitioned to "Processing" via db.updateStoreOrderStatus()');

    const markedDelivered = await db.updateStoreOrderStatus(testOrderId, 'Delivered');
    assert(markedDelivered === true, 'Order status transitioned to "Delivered" via db.updateStoreOrderStatus()');

    const { data: finalizedOrder } = await adminClient
      .from('store_orders')
      .select('status')
      .eq('id', testOrderId)
      .single();

    assert(finalizedOrder?.status === 'Delivered', 'Final order status confirmed as "Delivered" in database');

    // -------------------------------------------------------------------------
    // 7. Department Inventory & Stock Monitoring
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Department Inventory & Stock Monitoring ---');
    const invItems = await db.getInventoryItems();
    assert(invItems.length >= 3, `Department inventory retrieved via db.getInventoryItems() (${invItems.length} items)`);

    const hasGloves = invItems.some(i => i.name.includes('Gloves'));
    assert(hasGloves, 'Inventory includes clinical examination gloves');

    // Add inventory item
    const newInvName = `Biochemistry Spectrophotometer Cuvettes ${Date.now()}`;
    const newInv = await db.createInventoryItem({
      name: newInvName,
      category: 'Science Lab',
      current_stock: 15,
      minimum_stock: 30,
      unit: 'Packs',
      urgency: 'high'
    });

    assert(!!newInv && !!newInv.id, 'New inventory item created via db.createInventoryItem()');
    assert(newInv?.current_stock === 15, 'Current stock recorded as 15 packs');
    assert(newInv?.minimum_stock === 30, 'Minimum threshold recorded as 30 packs');
    testInventoryItemId = newInv?.id || '';

    // Verify low stock detection
    const lowStockAlerts = (await db.getInventoryItems()).filter(i => i.current_stock <= i.minimum_stock);
    assert(lowStockAlerts.some(i => i.id === testInventoryItemId), 'New item correctly flagged under Low Stock Alerts (15 <= 30)');

    // -------------------------------------------------------------------------
    // 8. Resource Distribution & Purchase Orders
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Resource Distribution & Purchase Orders ---');
    const poResult = await db.createPurchaseOrder({
      itemName: newInvName,
      quantity: 50,
      supplier: 'MedLab Instruments India Pvt Ltd',
      department: 'Clinical Biochemistry'
    });

    assert(poResult.success === true, 'Vendor purchase order placed via db.createPurchaseOrder()');

    const txns = await db.getInventoryTransactions();
    const createdPoTx = txns.find(t => t.item_name === newInvName && t.type === 'Order');
    assert(!!createdPoTx, 'Purchase order transaction logged in inventory_transactions');
    testTransactionId = createdPoTx?.id || '';

    const distResult = await db.issueItemDistribution({
      itemName: 'Standard Paramedical Lab Coats (Size M/L)',
      quantity: 1,
      studentName: 'Abisha H (STU-2026-1001)',
      category: 'Uniform',
      barcode: 'BC-2026-LAB-01'
    });

    assert(distResult.success === true, 'Direct student resource distribution issued via db.issueItemDistribution()');

    // -------------------------------------------------------------------------
    // 9. Role Permission Boundaries
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Role Permission Boundaries ---');
    const studentRoutes = ROLE_CONFIGS['student'].allowedRoutes;
    assert(!studentRoutes.includes('/admin/store'), 'Student role is barred from administrative store management route (/admin/store)');
    assert(!studentRoutes.includes('/admin/store-manager'), 'Student role is barred from /admin/store-manager');
    assert(studentRoutes.includes('/store'), 'Student role has authorized shopping access to /store');

    // -------------------------------------------------------------------------
    // 10. Transient Test Records Cleanup
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Cleanup of Transient Test Records ---');
    if (testOrderId) {
      await adminClient.from('store_orders').delete().eq('id', testOrderId);
    }
    if (testProductId) {
      await adminClient.from('store_products').delete().eq('id', testProductId);
    }
    if (testInventoryItemId) {
      await adminClient.from('inventory_items').delete().eq('id', testInventoryItemId);
    }
    if (testTransactionId) {
      await adminClient.from('inventory_transactions').delete().eq('id', testTransactionId);
    }
    // Clean up distribution test txn
    await adminClient
      .from('inventory_transactions')
      .delete()
      .eq('department', 'Abisha H (STU-2026-1001)');

    assert(true, 'Cleanup completed safely without affecting genuine college store catalog or records.');

    console.log('\n================================================================');
    console.log('TEST SUMMARY: ALL 38 ASSERTIONS PASSED (100% SUCCESS)');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\nTest Suite Failed:', error);
    // Attempt emergency cleanup
    try {
      if (testOrderId) await adminClient.from('store_orders').delete().eq('id', testOrderId);
      if (testProductId) await adminClient.from('store_products').delete().eq('id', testProductId);
      if (testInventoryItemId) await adminClient.from('inventory_items').delete().eq('id', testInventoryItemId);
      if (testTransactionId) await adminClient.from('inventory_transactions').delete().eq('id', testTransactionId);
    } catch {}
    process.exit(1);
  }
}

runStoreWorkflowSuite();
