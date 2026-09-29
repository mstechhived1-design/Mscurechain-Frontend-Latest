
export interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  featuredImage?: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogRequest {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  tags?: string[];
  featuredImage?: string;
  status?: "draft" | "published";
}

export interface Testimonial {
  _id: string;
  name: string;
  designation: string;
  company?: string;
  content: string;
  avatar?: string;
  rating: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialRequest {
  name: string;
  designation: string;
  company?: string;
  content: string;
  avatar?: string;
  rating?: number;
  status?: "active" | "inactive";
}
