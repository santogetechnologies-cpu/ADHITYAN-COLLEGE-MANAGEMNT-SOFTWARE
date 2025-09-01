import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Search, Plus, Edit, Eye, Download, FileText, Video, Music } from 'lucide-react';

export const DigitalCatalog = () => {
  const [books] = useState([
    {
      id: 1,
      title: 'Advanced Mathematics',
      author: 'Dr. John Smith',
      isbn: '978-0-123456-78-9',
      category: 'Textbook',
      subject: 'Mathematics',
      class: 'Class 12',
      type: 'Physical',
      status: 'Available',
      totalCopies: 25,
      availableCopies: 18,
      publishedYear: 2023,
      publisher: 'Academic Press'
    },
    {
      id: 2,
      title: 'Modern Physics Concepts',
      author: 'Prof. Sarah Johnson',
      isbn: '978-0-987654-32-1',
      category: 'Reference',
      subject: 'Physics',
      class: 'Class 11',
      type: 'Digital',
      status: 'Available',
      totalCopies: 1,
      availableCopies: 1,
      publishedYear: 2024,
      publisher: 'Science Publications'
    },
    {
      id: 3,
      title: 'Interactive Chemistry Lab',
      author: 'Dr. Michael Brown',
      isbn: '978-0-456789-12-3',
      category: 'E-Resource',
      subject: 'Chemistry',
      class: 'Class 10',
      type: 'Interactive',
      status: 'Available',
      totalCopies: 'Unlimited',
      availableCopies: 'Unlimited',
      publishedYear: 2024,
      publisher: 'Digital Learning'
    }
  ]);

  const [researchPapers] = useState([
    {
      id: 1,
      title: 'Quantum Computing Applications in Education',
      authors: ['Dr. Alice Wilson', 'Prof. Bob Davis'],
      journal: 'Educational Technology Review',
      publishedDate: '2024-02-15',
      doi: '10.1234/etr.2024.001',
      abstract: 'This paper explores the potential applications of quantum computing in educational settings...',
      keywords: ['Quantum Computing', 'Education', 'Technology'],
      downloadCount: 45
    },
    {
      id: 2,
      title: 'Sustainable Energy Solutions for Schools',
      authors: ['Dr. Green Energy', 'Prof. Solar Power'],
      journal: 'Environmental Education Journal',
      publishedDate: '2024-01-20',
      doi: '10.1234/eej.2024.002',
      abstract: 'An analysis of renewable energy implementation in educational institutions...',
      keywords: ['Renewable Energy', 'Sustainability', 'Schools'],
      downloadCount: 32
    }
  ]);

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
        return 'secondary';
      case 'Reserved':
        return 'outline';
      case 'Maintenance':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Digital Catalog</h2>
          <p className="text-muted-foreground">Comprehensive library catalog with books, e-resources, and research papers</p>
        </div>
        <Dialog>
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
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="Resource title" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author(s)</Label>
                  <Input id="author" placeholder="Author name" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="textbook">Textbook</SelectItem>
                      <SelectItem value="reference">Reference</SelectItem>
                      <SelectItem value="e-resource">E-Resource</SelectItem>
                      <SelectItem value="research">Research Paper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical Book</SelectItem>
                      <SelectItem value="digital">Digital Book</SelectItem>
                      <SelectItem value="interactive">Interactive Resource</SelectItem>
                      <SelectItem value="audio">Audio Book</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input id="isbn" placeholder="978-0-123456-78-9" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="copies">Total Copies</Label>
                  <Input id="copies" type="number" placeholder="25" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Brief description of the resource" rows={3} />
              </div>

              <Button className="w-full">Add to Catalog</Button>
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
                <Input id="search" placeholder="Title, author, ISBN..." className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select>
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
              <Select>
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
              <Select>
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
          <CardTitle>Books & Resources</CardTitle>
          <CardDescription>Browse all books and educational resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {books.map((book) => (
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
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {book.type === 'Digital' && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Research Papers */}
      <Card>
        <CardHeader>
          <CardTitle>Research Papers</CardTitle>
          <CardDescription>Academic research papers and publications</CardDescription>
        </CardHeader>
        <CardContent>
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
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {paper.abstract}
                  </p>

                  <div className="flex justify-between items-center text-sm">
                    <div className="flex gap-2">
                      {paper.keywords.map((keyword, index) => (
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
        </CardContent>
      </Card>
    </div>
  );
};