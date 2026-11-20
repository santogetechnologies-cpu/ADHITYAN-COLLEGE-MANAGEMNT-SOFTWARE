import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SECRET_KEY || '';
  const supabase = createClient(url, key);

  console.log('Standardizing store_products for Adithyan College Paramedical Store...');

  // 1. Remove legacy school items if present
  const schoolItemPatterns = ['School Notebook%', 'School Uniform%', 'School Bag%'];
  for (const pat of schoolItemPatterns) {
    const { data: oldItems } = await supabase.from('store_products').select('id, name').ilike('name', pat);
    if (oldItems && oldItems.length > 0) {
      for (const item of oldItems) {
        await supabase.from('store_products').delete().eq('id', item.id);
        console.log(`Removed legacy school item: ${item.name} (${item.id})`);
      }
    }
  }

  // 2. Paramedical products catalog
  const paramedicalProducts = [
    {
      name: 'Adithyan College Clinical Lab Coat (100% Cotton, Embroidered Crest)',
      category: 'Uniform & Apparel',
      price: 450,
      rating: 4.9,
      stock: 120,
      description: 'Institutional laboratory protective coat with embroidered college crest. High-grade breathable 100% white cotton.',
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Paramedical Clinical Uniform Scrub Suit (Navy Blue)',
      category: 'Uniform & Apparel',
      price: 850,
      rating: 4.8,
      stock: 90,
      description: 'Standard hospital clinical scrub suit (top & trousers) for OT, Anaesthesia, Dialysis & MLT practicals.',
      image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Clinical Diagnostic Stethoscope (Dual Head Stainless Steel)',
      category: 'Clinical Equipment',
      price: 1250,
      rating: 4.9,
      stock: 45,
      description: 'Acoustically superior dual-head stethoscope designed for cardiac, respiratory, and general clinical diagnostics.',
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Dialysis & Venipuncture Training Kit',
      category: 'Clinical Equipment',
      price: 2100,
      rating: 4.9,
      stock: 30,
      description: 'Simulated clinical arm kit for IV cannulation, dialysis fistula access, and blood collection training.',
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Medical Surgical Dissection & Suture Practice Kit',
      category: 'Clinical Equipment',
      price: 1450,
      rating: 4.8,
      stock: 40,
      description: 'Comprehensive 14-piece stainless steel medical tool set with reusable suture practice pad and needles.',
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Digital Pulse Oximeter & SpO2 Monitor',
      category: 'Diagnostics & Electronics',
      price: 750,
      rating: 4.7,
      stock: 65,
      description: 'Hospital-grade fingertip pulse oximeter with OLED plethysmogram display for vital monitoring.',
      image_url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Robbins & Cotran Pathologic Basis of Disease (Paramedical Edition)',
      category: 'Textbooks & Records',
      price: 1150,
      rating: 5.0,
      stock: 50,
      description: 'Comprehensive standard reference for general pathology, systemic pathology, and laboratory correlations.',
      image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Practical Laboratory Clinical Record Book (Hardbound Set of 3)',
      category: 'Stationery',
      price: 280,
      rating: 4.6,
      stock: 200,
      description: 'University authorized hardbound laboratory record notebooks with ruled and blank graph pages.',
      image_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Sterile Nitrile Clinical Examination Gloves (Box of 100)',
      category: 'Consumables',
      price: 380,
      rating: 4.7,
      stock: 150,
      description: 'Powder-free, textured medical examination gloves offering superior barrier protection for clinical labs.',
      image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
    },
    {
      name: 'Adhithyan College Crest Varsity Hoodie (Royal Blue)',
      category: 'Uniform & Apparel',
      price: 899,
      rating: 4.9,
      stock: 60,
      description: 'Official college winterwear hoodie with premium embroidered crest and kangaroo pocket.',
      image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80'
    }
  ];

  for (const prod of paramedicalProducts) {
    const { data: existing } = await supabase.from('store_products').select('id').eq('name', prod.name).maybeSingle();
    if (existing) {
      await supabase.from('store_products').update(prod).eq('id', existing.id);
      console.log(`Updated product: ${prod.name}`);
    } else {
      await supabase.from('store_products').insert(prod);
      console.log(`Inserted product: ${prod.name}`);
    }
  }

  // 3. Ensure inventory items are standard
  const standardInventory = [
    {
      name: 'Standard Paramedical Lab Coats (Size M/L)',
      category: 'Uniform',
      current_stock: 120,
      minimum_stock: 30,
      unit: 'Pieces',
      urgency: 'medium'
    },
    {
      name: 'Sterile Nitrile Examination Gloves (Boxes)',
      category: 'Consumables',
      current_stock: 150,
      minimum_stock: 50,
      unit: 'Boxes',
      urgency: 'low'
    },
    {
      name: 'Clinical Haematology Test Tubes & Reagents',
      category: 'Science Lab',
      current_stock: 15,
      minimum_stock: 40,
      unit: 'Kits',
      urgency: 'high'
    },
    {
      name: 'A4 College Examination Answer Booklets',
      category: 'Stationery',
      current_stock: 450,
      minimum_stock: 100,
      unit: 'Booklets',
      urgency: 'low'
    }
  ];

  for (const inv of standardInventory) {
    const { data: exInv } = await supabase.from('inventory_items').select('id').eq('name', inv.name).maybeSingle();
    if (!exInv) {
      await supabase.from('inventory_items').insert(inv);
      console.log(`Inserted inventory item: ${inv.name}`);
    }
  }

  console.log('Store products & inventory successfully standardized!');
}

main().catch((err) => {
  console.error('Standardization failed:', err);
  process.exit(1);
});

