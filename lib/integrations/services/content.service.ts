import { apiClient } from "../api";
import { PUBLIC_ENDPOINTS, ADMIN_ENDPOINTS } from "../config";
import { Blog, Testimonial, CreateBlogRequest, CreateTestimonialRequest } from "../types/cms";

/**
 * Service for managing landing page content (Blogs & Testimonials)
 */
export const contentService = {
  // ─── PUBLIC API ───────────────────────────────────────────────────────────
  
  /**
   * Fetch all published blogs for the landing page
   */
  getPublicBlogs: async (): Promise<Blog[]> => {
    const response = await apiClient<{ success: boolean; data: Blog[] }>(
      PUBLIC_ENDPOINTS.BLOGS
    );
    return response.data;
  },

  /**
   * Fetch all active testimonials for the landing page
   */
  getPublicTestimonials: async (): Promise<Testimonial[]> => {
    const response = await apiClient<{ success: boolean; data: Testimonial[] }>(
      PUBLIC_ENDPOINTS.TESTIMONIALS
    );
    return response.data;
  },

  // ─── ADMIN API ────────────────────────────────────────────────────────────

  /**
   * Fetch all blogs (Admin view)
   */
  getAdminBlogs: async (): Promise<Blog[]> => {
    const response = await apiClient<{ success: boolean; data: Blog[] }>(
      ADMIN_ENDPOINTS.BLOGS.BASE
    );
    return response.data;
  },

  /**
   * Create a new blog
   */
  createBlog: async (data: CreateBlogRequest): Promise<Blog> => {
    const response = await apiClient<{ success: boolean; data: Blog }>(
      ADMIN_ENDPOINTS.BLOGS.BASE,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Update an existing blog
   */
  updateBlog: async (id: string, data: Partial<CreateBlogRequest>): Promise<Blog> => {
    const response = await apiClient<{ success: boolean; data: Blog }>(
      ADMIN_ENDPOINTS.BLOGS.BY_ID(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Delete a blog
   */
  deleteBlog: async (id: string): Promise<void> => {
    await apiClient(ADMIN_ENDPOINTS.BLOGS.BY_ID(id), {
      method: "DELETE",
    });
  },

  /**
   * Fetch all testimonials (Admin view)
   */
  getAdminTestimonials: async (): Promise<Testimonial[]> => {
    const response = await apiClient<{ success: boolean; data: Testimonial[] }>(
      ADMIN_ENDPOINTS.TESTIMONIALS.BASE
    );
    return response.data;
  },

  /**
   * Create a new testimonial
   */
  createTestimonial: async (data: CreateTestimonialRequest): Promise<Testimonial> => {
    const response = await apiClient<{ success: boolean; data: Testimonial }>(
      ADMIN_ENDPOINTS.TESTIMONIALS.BASE,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Update an existing testimonial
   */
  updateTestimonial: async (id: string, data: Partial<CreateTestimonialRequest>): Promise<Testimonial> => {
    const response = await apiClient<{ success: boolean; data: Testimonial }>(
      ADMIN_ENDPOINTS.TESTIMONIALS.BY_ID(id),
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  /**
   * Delete a testimonial
   */
  deleteTestimonial: async (id: string): Promise<void> => {
    await apiClient(ADMIN_ENDPOINTS.TESTIMONIALS.BY_ID(id), {
      method: "DELETE",
    });
  },
};

export default contentService;
