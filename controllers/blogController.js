import { BlogPost } from '../models/BlogPost.js';

const createSlug = (value) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const getPublishedPosts = async (req, res, next) => {
  try {
    const posts = await BlogPost.find({ status: 'published' }).sort({ publishedAt: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: posts.length, posts });
  } catch (error) {
    next(error);
  }
};

export const getPublishedPostBySlug = async (req, res, next) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, status: 'published' });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found.' });
    }
    res.status(200).json({ success: true, post });
  } catch (error) {
    next(error);
  }
};

export const getAdminPosts = async (req, res, next) => {
  try {
    const posts = await BlogPost.find().sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: posts.length, posts });
  } catch (error) {
    next(error);
  }
};

export const createBlogPost = async (req, res, next) => {
  try {
    const postData = {
      ...req.body,
      slug: createSlug(req.body.slug || req.body.title || ''),
    };
    if (postData.status === 'published') postData.publishedAt = new Date();
    const post = await BlogPost.create(postData);
    res.status(201).json({ success: true, message: 'Blog post created.', post });
  } catch (error) {
    next(error);
  }
};

export const updateBlogPost = async (req, res, next) => {
  try {
    const currentPost = await BlogPost.findById(req.params.id);
    if (!currentPost) {
      return res.status(404).json({ success: false, message: 'Blog post not found.' });
    }

    const updates = { ...req.body };
    if (updates.title || updates.slug) {
      updates.slug = createSlug(updates.slug || updates.title);
    }
    if (updates.status === 'published' && currentPost.status !== 'published') {
      updates.publishedAt = new Date();
    }
    if (updates.status === 'draft') updates.publishedAt = null;

    Object.assign(currentPost, updates);
    await currentPost.save();
    res.status(200).json({ success: true, message: 'Blog post updated.', post: currentPost });
  } catch (error) {
    next(error);
  }
};

export const deleteBlogPost = async (req, res, next) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found.' });
    }
    res.status(200).json({ success: true, message: 'Blog post deleted.' });
  } catch (error) {
    next(error);
  }
};
