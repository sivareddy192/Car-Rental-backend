import express from 'express';
import {
  createBlogPost,
  deleteBlogPost,
  getAdminPosts,
  getPublishedPostBySlug,
  getPublishedPosts,
  updateBlogPost,
} from '../controllers/blogController.js';
import { adminOnly, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getPublishedPosts);
router.get('/admin/all', protect, adminOnly, getAdminPosts);
router.post('/', protect, adminOnly, createBlogPost);
router.put('/:id', protect, adminOnly, updateBlogPost);
router.delete('/:id', protect, adminOnly, deleteBlogPost);
router.get('/:slug', getPublishedPostBySlug);

export default router;
