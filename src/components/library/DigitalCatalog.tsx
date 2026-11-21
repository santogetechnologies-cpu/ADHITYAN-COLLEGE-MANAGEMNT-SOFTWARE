import { useState, useEffect, useCallback } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Search, Plus, Eye, Download, FileText, Video, Music, Loader2 } from 'lucide-react';
import { db } from '@/services/supabase/database';
import { useToast } from '@/hooks/use-toast';
import { LibraryBook } from '@/types/database.types';

export const DigitalCatalog = () => {
  const { toast } = useToast();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Resource Form
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newCategory, setNewCategory] = useState('Textbook');
  const [newType, setNewType] = useState('Physical');
  const [newIsbn, setNewIsbn] = useState('');
  const [newCopies, setNewCopies] = useState('25');
  const [newDescription, setNewDescription] = useState('');

  const [researchPapers, setResearchPapers] = useState<any[]>([]);

  const loadBooks = useCallback(async () => {
    try {
      const [data, digitalData] = await Promise.all([
        db.getLibraryBooks(),
        db.getDigitalLibraryResources()
      ]);

      if (data && data.length > 0) {
        const mapped = data.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn || '978-0-123456-78-9',
          category: b.category,
          subject: b.subject,
          class: b.class_level || 'General',
          type: b.type,
          status: b.status,
          totalCopies: b.total_copies,
          availableCopies: b.available_copies,
          publishedYear: b.published_year || 2024,
          publisher: b.publisher || 'Academic Press'
        }));
        setBooks(mapped);
      } else {
        setBooks([]);
      }

      if (digitalData && digitalData.length > 0) {
        const mappedPapers = digitalData
          .filter((d: any) => (d.category || '').toLowerCase().includes('paper') || (d.category || '').toLowerCase().includes('journal') || (d.type || '').toLowerCase().includes('pdf'))
          .map((d: any, idx: number) => ({
            id: d.id,
            title: d.title,
            authors: [d.uploaded_by || 'Faculty Researcher'],
            journal: d.category || 'Adithyan College Health Repository',
            publishedDate: d.created_at ? d.created_at.split('T')[0] : 'Recent',
            doi: `10.1234/adithyan.${String(idx + 1).padStart(3, '0')}`,
            abstract: d.description || 'Full-text clinical and academic reference resource.',
            keywords: ['Paramedical', d.category || 'Allied Health'],
            downloadCount: d.downloads || 0
          }));
        setResearchPapers(mappedPapers);
      } else {
        setResearchPapers([]);
      }
    } catch (err) {
      console.error('Failed to load library catalog:', err);
      setBooks([]);
      setResearchPapers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Real-time synchronization for catalog additions, modifications, and removals
  useRealtimeSubscription({ table: 'library_books', onChange: loadBooks, onReconnect: loadBooks });

  const handleAddResource = async () => {
    if (!newTitle.trim() || !newAuthor.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter at least Title and Author.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const code = `BK${Date.now().toString().slice(-4)}`;
      const copiesNum = parseInt(newCopies) || 10;
      const created = await db.addLibraryBook({
        book_code: code,
        title: newTitle,
        author: newAuthor,
        isbn: newIsbn || `978-0-${Date.now().toString().slice(-6)}`,
        category: newCategory,
        subject: 'General Science',
        class_level: 'All Classes',
        type: newType as any,
        status: 'Available',
        total_copies: copiesNum,
        available_copies: copiesNum,
        published_year: new Date().getFullYear(),
        publisher: 'Adithyan College Central Library'
      });

      const bookObj = {
        id: created?.id || Date.now().toString(),
        title: newTitle,
        author: newAuthor,
        isbn: newIsbn || `978-0-${Date.now().toString().slice(-6)}`,
        category: newCategory,
        subject: 'General',
        class: 'All Classes',
        type: newType,
        status: 'Available',
        totalCopies: copiesNum,
        availableCopies: copiesNum,
        publishedYear: new Date().getFullYear(),
        publisher: 'Adithyan College Central Library'
      };

      setBooks(prev => [bookObj, ...prev]);
      setDialogOpen(false);
      setNewTitle('');
      setNewAuthor('');
      setNewIsbn('');
      setNewDescription('');

      toast({
        title: "Resource Added",
        description: `${newTitle} has been cataloged in Supabase.`
      });
    } catch (err: any) {
      toast({
        title: "Error adding book",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Physical':
        return <BookOpen className="h-4 w-4" />;
      case 'Digital':
        return <FileText className="h-4 w-4" />;
      case 'Interactive':
        return <Video className="h-4 w-4" />;
      case 'Audio':
        return <Music className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'default';
      case 'Checked Out':
      case 'Issued':
        return 'secondary';
      case 'Reserved':
        return 'outline';
      case 'Maintenance':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.isbn && b.isbn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Digital Catalog</h2>
          <p className="text-muted-foreground">Comprehensive library catalog with books, e-resources, and research papers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Resource</DialogTitle>
              <DialogDescription>Add a new book, e-resource, or research paper to the catalog</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title" 
                    placeholder="Resource title" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author(s) *</Label>
                  <Input 
                    id="author" 
                    placeholder="Author name" 
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Textbook">Textbook</SelectItem>
                      <SelectItem value="Reference">Reference</SelectItem>
                      <SelectItem value="E-Resource">E-Resource</SelectItem>
                      <SelectItem value="Research Paper">Research Paper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Physical">Physical Book</SelectItem>
                      <SelectItem value="Digital">Digital Book</SelectItem>
                      <SelectItem value="Interactive">Interactive Resource</SelectItem>
                      <SelectItem value="Audio">Audio Book</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input 
                    id="isbn" 
                    placeholder="978-0-123456-78-9" 
                    value={newIsbn}
                    onChange={(e) => setNewIsbn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="copies">Total Copies</Label>
                  <Input 
                    id="copies" 
                    type="number" 
                    placeholder="25" 
                    value={newCopies}
                    onChange={(e) => setNewCopies(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Brief description of the resource" 
                  rows={3} 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <Button className="w-full" onClick={handleAddResource} disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cataloging...
                  </span>
                ) : (
                  'Add to Catalog'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="search">Search Catalog</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search" 
                  placeholder="Title, author, ISBN..." 
                  className="pl-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="textbook">Textbook</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="e-resource">E-Resource</SelectItem>
                  <SelectItem value="research">Research Paper</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Availability</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="checked-out">Checked Out</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Books Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Books & Resources ({filteredBooks.length})</CardTitle>
          <CardDescription>Browse all books and educational resources</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBooks.map((book) => (
                <div key={book.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(book.type)}
                          <h3 className="font-semibold text-lg">{book.title}</h3>
                        </div>
                        <Badge variant={getStatusColor(book.status)}>
                          {book.status}
                        </Badge>
                        <Badge variant="outline">
                          {book.category}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Author:</span>
                          <p className="font-medium">{book.author}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subject:</span>
                          <p className="font-medium">{book.subject}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Class:</span>
                          <p className="font-medium">{book.class}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Available:</span>
                          <p className="font-medium">
                            {book.availableCopies}/{book.totalCopies}
                          </p>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>ISBN: {book.isbn} • Published: {book.publishedYear} • {book.publisher}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => toast({ title: "View Resource", description: `Viewing ${book.title}` })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {book.type === 'Digital' && (
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "Downloading Resource", description: `Downloading ${book.title} eBook` })}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Papers */}
      <Card>
        <CardHeader>
          <CardTitle>Research Papers</CardTitle>
          <CardDescription>Academic research papers and publications</CardDescription>
        </CardHeader>
        <CardContent>
          {researchPapers.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground/80">No Research Papers Uploaded</p>
              <p className="text-xs text-muted-foreground mt-0.5">Faculty and student research papers uploaded to the digital library will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {researchPapers.map((paper) => (
                <div key={paper.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{paper.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          by {paper.authors.join(', ')} • {paper.journal} • {paper.publishedDate}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "Research Preview", description: `Viewing publication abstract for ${paper.title}` })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toast({ title: "Paper Download", description: `Downloading PDF publication: ${paper.doi}` })}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {paper.abstract}
                    </p>

                    <div className="flex justify-between items-center text-sm">
                      <div className="flex gap-2">
                        {paper.keywords.map((keyword: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-muted-foreground">
                        DOI: {paper.doi} • Downloaded {paper.downloadCount} times
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
