import express from 'express';
import homepageController from '../controllers/project.controller';

const router = express.Router();

// Homepage-specific routes
router.get('/homepage', homepageController.getProjectData);
router.get('/homepage/featured', homepageController.getFeaturedProjects);
router.get('/homepage/recent', homepageController.getRecentProjects);
router.get('/homepage/categories', homepageController.getProjectsByCategory);

// Original project CRUD routes
router.get('/', homepageController.getAllProjects);
router.get('/:id', homepageController.getProjectById);
router.post('/', homepageController.createProject);
router.put('/:id', homepageController.updateProject);
router.delete('/:id', homepageController.deleteProject);

export default router;