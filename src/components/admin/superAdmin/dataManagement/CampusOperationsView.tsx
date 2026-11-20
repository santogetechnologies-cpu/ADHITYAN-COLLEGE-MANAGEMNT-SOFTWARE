import React, { useState } from 'react';
import { useCollege } from '@/context/CollegeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building,
  Bus,
  BookOpen,
  ShoppingBag,
  Home,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Phone,
  PackageCheck,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

export function CampusOperationsView() {
  const { currentCollege } = useCollege();
  const [activeTab, setActiveTab] = useState<'transport' | 'library' | 'store' | 'hostel'>('transport');

  // 1. Transport Data
  const [buses, setBuses] = useState([
    { id: 'b-1', bus_no: 'TN 38 BH 1024', driver_name: 'M. Selvam', phone: '+91 94431 82710', route: 'Gandhipuram ➔ Campus', capacity: 54, enrolled: 48, status: 'On Route' },
    { id: 'b-2', bus_no: 'TN 38 BH 1025', driver_name: 'R. Murugan', phone: '+91 98422 93812', route: 'Singanallur ➔ Sulur ➔ Campus', capacity: 54, enrolled: 51, status: 'On Route' },
    { id: 'b-3', bus_no: 'TN 38 BH 1026', driver_name: 'K. Senthil', phone: '+91 97891 10293', route: 'Ukkadam ➔ Podanur ➔ Campus', capacity: 42, enrolled: 39, status: 'Depot' },
    { id: 'b-4', bus_no: 'TN 38 BH 1027', driver_name: 'P. Anand', phone: '+91 96551 72910', route: 'Thudiyalur ➔ Saibaba Colony ➔ Campus', capacity: 54, enrolled: 52, status: 'On Route' }
  ]);

  // 2. Library Data
  const [books, setBooks] = useState([
    { id: 'bk-1', title: 'Todd-Sanford Clinical Diagnosis and Management', author: 'Richard A. McPherson', isbn: '978-0323673549', available: 14, total: 20, rack: 'Rack B-12' },
    { id: 'bk-2', title: 'Textbook of Dialysis Therapy (5th Edition)', author: 'Allen R. Nissenson', isbn: '978-1455740475', available: 8, total: 12, rack: 'Rack C-04' },
    { id: 'bk-3', title: 'Christensen’s Physics of Diagnostic Radiology', author: 'Thomas S. Curry', isbn: '978-0812113105', available: 6, total: 10, rack: 'Rack D-08' },
    { id: 'bk-4', title: 'Berry & Kohn’s Operating Room Technique', author: 'Nancymarie Phillips', isbn: '978-0323399425', available: 11, total: 15, rack: 'Rack E-02' }
  ]);

  // 3. Store Inventory Data
  const [inventory, setInventory] = useState([
    { id: 'inv-1', name: 'Clinical White Lab Coat (Full Sleeve - Logo Embroidered)', category: 'Uniform Kit', stock: 185, min_reorder: 50, price: 850 },
    { id: 'inv-2', name: 'Paramedical Dissection Instrument Set (14 Pieces)', category: 'Lab Equipment', stock: 92, min_reorder: 30, price: 1650 },
    { id: 'inv-3', name: 'Standard Stethoscope (Dual Head Medical Grade)', category: 'Diagnostic Tool', stock: 64, min_reorder: 25, price: 1200 },
    { id: 'inv-4', name: 'Medical Lab Technology First Year Handbook Set', category: 'Textbooks', stock: 140, min_reorder: 40, price: 2100 }
  ]);

  // 4. Hostel Data
  const [hostelBlocks, setHostelBlocks] = useState([
    { id: 'hb-1', name: 'Allied Health Boys Residence (Block A)', gender: 'Boys', total_rooms: 80, capacity_beds: 240, occupied: 214, warden: 'Mr. V. Sakthivel', phone: '+91 98430 11920' },
    { id: 'hb-2', name: 'Nightingale Healthcare Girls Residence (Block B)', gender: 'Girls', total_rooms: 90, capacity_beds: 270, occupied: 248, warden: 'Dr. G. Lakshmi', phone: '+91 97890 22831' }
  ]);

  // Add Bus Modal State
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [busForm, setBusForm] = useState({ bus_no: '', driver_name: '', phone: '', route: '', capacity: 54 });

  // Add Book Modal State
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', total: 10, rack: 'Rack A-01' });

  // Add Store SKU Modal State
  const [isAddSkuOpen, setIsAddSkuOpen] = useState(false);
  const [skuForm, setSkuForm] = useState({ name: '', category: 'Uniform Kit', stock: 100, price: 500, min_reorder: 20 });

  const handleAddBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busForm.bus_no.trim() || !busForm.route.trim()) return;
    const newBus = { id: `b-${Date.now()}`, ...busForm, enrolled: 0, status: 'Depot' };
    setBuses(prev => [...prev, newBus]);
    toast.success(`Vehicle "${busForm.bus_no}" assigned to route "${busForm.route}"!`);
    setIsAddBusOpen(false);
    setBusForm({ bus_no: '', driver_name: '', phone: '', route: '', capacity: 54 });
  };

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title.trim()) return;
    const newBook = { id: `bk-${Date.now()}`, ...bookForm, available: Number(bookForm.total) };
    setBooks(prev => [...prev, newBook]);
    toast.success(`Title "${bookForm.title}" indexed into library digital catalog!`);
    setIsAddBookOpen(false);
    setBookForm({ title: '', author: '', isbn: '', total: 10, rack: 'Rack A-01' });
  };

  const handleAddSku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuForm.name.trim()) return;
    const newSku = { id: `inv-${Date.now()}`, ...skuForm, stock: Number(skuForm.stock), price: Number(skuForm.price) };
    setInventory(prev => [...prev, newSku]);
    toast.success(`Inventory SKU "${skuForm.name}" registered in campus store!`);
    setIsAddSkuOpen(false);
    setSkuForm({ name: '', category: 'Uniform Kit', stock: 100, price: 500, min_reorder: 20 });
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>Campus Operations, Auxiliary Services & Facilities</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Direct operational management of college bus routes, library resource indexing, campus uniform store, and residential hostel allocations for {currentCollege.name}.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'transport' && (
            <Button size="sm" onClick={() => setIsAddBusOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold">
              <Plus className="w-4 h-4 mr-1" />
              Add Bus Vehicle
            </Button>
          )}
          {activeTab === 'library' && (
            <Button size="sm" onClick={() => setIsAddBookOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold">
              <Plus className="w-4 h-4 mr-1" />
              Index Book Title
            </Button>
          )}
          {activeTab === 'store' && (
            <Button size="sm" onClick={() => setIsAddSkuOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold">
              <Plus className="w-4 h-4 mr-1" />
              Add Store Item
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="transport" className="data-[state=active]:bg-white text-xs font-semibold py-1.5 px-3">
            <Bus className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Transport Fleet ({buses.length})
          </TabsTrigger>
          <TabsTrigger value="library" className="data-[state=active]:bg-white text-xs font-semibold py-1.5 px-3">
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Library Catalog ({books.length})
          </TabsTrigger>
          <TabsTrigger value="store" className="data-[state=active]:bg-white text-xs font-semibold py-1.5 px-3">
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Campus Store ({inventory.length})
          </TabsTrigger>
          <TabsTrigger value="hostel" className="data-[state=active]:bg-white text-xs font-semibold py-1.5 px-3">
            <Home className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            Hostels ({hostelBlocks.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Transport */}
        <TabsContent value="transport" className="m-0 space-y-3">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[140px] text-xs font-bold text-slate-700">Vehicle Registration</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Driver & Contact</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">Designated Bus Route</TableHead>
                  <TableHead className="w-[130px] text-xs font-bold text-slate-700">Seating Capacity</TableHead>
                  <TableHead className="w-[110px] text-xs font-bold text-slate-700">Fleet Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-slate-900">
                      <Badge variant="outline" className="bg-slate-100 font-mono text-[11px]">
                        {b.bus_no}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">{b.driver_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{b.phone}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-800">
                      {b.route}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      <span className="font-semibold">{b.enrolled}</span> / {b.capacity} Students
                    </TableCell>
                    <TableCell>
                      <Badge className={b.status === 'On Route' ? 'bg-emerald-100 text-emerald-800 text-[10px]' : 'bg-slate-100 text-slate-700 text-[10px]'}>
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 2: Library */}
        <TabsContent value="library" className="m-0 space-y-3">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700">Book Title & Author</TableHead>
                  <TableHead className="w-[150px] text-xs font-bold text-slate-700">ISBN Code</TableHead>
                  <TableHead className="w-[120px] text-xs font-bold text-slate-700">Shelf Rack</TableHead>
                  <TableHead className="w-[140px] text-xs font-bold text-slate-700">Stock Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((bk) => (
                  <TableRow key={bk.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">{bk.title}</div>
                      <div className="text-[11px] text-slate-500">{bk.author}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">
                      {bk.isbn}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-mono">
                      <Badge variant="outline" className="bg-slate-50 text-[10px] font-mono">
                        {bk.rack}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-emerald-700 font-mono">{bk.available} Available</span>
                        <span className="text-[10px] text-slate-400">({bk.total} Total)</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 3: Campus Store */}
        <TabsContent value="store" className="m-0 space-y-3">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700">Item SKU & Name</TableHead>
                  <TableHead className="w-[140px] text-xs font-bold text-slate-700">Category</TableHead>
                  <TableHead className="w-[120px] text-xs font-bold text-slate-700">Price (₹)</TableHead>
                  <TableHead className="w-[140px] text-xs font-bold text-slate-700">Inventory Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      {inv.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                        {inv.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-slate-900">
                      ₹{inv.price.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <Badge className={inv.stock > inv.min_reorder ? 'bg-emerald-100 text-emerald-800 text-[10px]' : 'bg-rose-100 text-rose-800 text-[10px]'}>
                        {inv.stock} in Stock
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 4: Hostels */}
        <TabsContent value="hostel" className="m-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hostelBlocks.map((hb) => (
              <Card key={hb.id} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900">{hb.name}</CardTitle>
                    <Badge className={hb.gender === 'Boys' ? 'bg-blue-100 text-blue-800 text-[10px]' : 'bg-pink-100 text-pink-800 text-[10px]'}>
                      {hb.gender} Wing
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">Warden: {hb.warden} • {hb.phone}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2 text-xs">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block">Total Rooms</span>
                      <span className="font-bold text-sm text-slate-900">{hb.total_rooms}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block">Bed Capacity</span>
                      <span className="font-bold text-sm text-slate-900">{hb.capacity_beds}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block">Occupied</span>
                      <span className="font-bold text-sm text-indigo-700">{hb.occupied} Beds</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Bus Modal */}
      <Dialog open={isAddBusOpen} onOpenChange={setIsAddBusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <Bus className="w-5 h-5 text-amber-600" />
              <span>Register College Transport Vehicle</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBus} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Vehicle Number *</Label>
              <Input placeholder="e.g. TN 38 BH 1028" value={busForm.bus_no} onChange={e => setBusForm({ ...busForm, bus_no: e.target.value.toUpperCase() })} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Designated Bus Route *</Label>
              <Input placeholder="e.g. Hope College ➔ Peelamedu ➔ Campus" value={busForm.route} onChange={e => setBusForm({ ...busForm, route: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Driver Name</Label>
                <Input placeholder="Driver Name" value={busForm.driver_name} onChange={e => setBusForm({ ...busForm, driver_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Driver Contact</Label>
                <Input placeholder="+91 90000 00000" value={busForm.phone} onChange={e => setBusForm({ ...busForm, phone: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddBusOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 text-white">Register Bus</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Book Modal */}
      <Dialog open={isAddBookOpen} onOpenChange={setIsAddBookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Index New Book Title</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBook} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Book Title *</Label>
              <Input placeholder="Full Book Title" value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Author</Label>
              <Input placeholder="Author Name" value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">ISBN</Label>
                <Input placeholder="978-..." value={bookForm.isbn} onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Total Copies</Label>
                <Input type="number" value={bookForm.total} onChange={e => setBookForm({ ...bookForm, total: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddBookOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 text-white">Index Book</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Store SKU Modal */}
      <Dialog open={isAddSkuOpen} onOpenChange={setIsAddSkuOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span>Add Campus Store SKU</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSku} className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Item SKU Name *</Label>
              <Input placeholder="e.g. Paramedical Lab Stethoscope" value={skuForm.name} onChange={e => setSkuForm({ ...skuForm, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Stock Quantity</Label>
                <Input type="number" value={skuForm.stock} onChange={e => setSkuForm({ ...skuForm, stock: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Unit Price (₹)</Label>
                <Input type="number" value={skuForm.price} onChange={e => setSkuForm({ ...skuForm, price: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddSkuOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 text-white">Register SKU</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
