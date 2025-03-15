// controllers/project.controller.ts
import { Request, Response } from 'express';
import projectService, { ProjectOptions } from '../services/project.service';

class ProjectController {
  // Main endpoint for project data
  async getProjectData(req: Request, res: Response): Promise<void> {
    try {
      const options: ProjectOptions = {
        featuredLimit: req.query.featuredLimit ? parseInt(req.query.featuredLimit as string) : undefined,
        recentLimit: req.query.recentLimit ? parseInt(req.query.recentLimit as string) : undefined,
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
      };
      
      const projectData = await projectService.getProjectData(options);
      
      // Set cache headers to improve performance
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.status(200).json(projectData);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ 
        message: error.message,
        details: error.details || undefined
      });
    }
  }

  // Get featured projects only
  async getFeaturedProjects(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const featuredProjects = await projectService.getFeaturedProjects(limit);
      
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).json(featuredProjects);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  // Get recent projects only
  async getRecentProjects(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const recentProjects = await projectService.getRecentProjects(limit);
      
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).json(recentProjects);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  // Get projects by category
  async getProjectsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const categories = req.query.categories as string[] || [];
      const projectsByCategory = await projectService.getProjectsByCategories(categories);
      
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).json(projectsByCategory);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  // Project CRUD methods (kept for completeness)
  async getProjectById(req: Request, res: Response): Promise<void> {
    try {
      const project = await projectService.getProjectById(req.params.id);
      
      res.setHeader('Cache-Control', 'public, max-age=600'); // Cache for 10 minutes
      res.status(200).json(project);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await projectService.getAllProjects();
      res.status(200).json(projects);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const newProject = await projectService.createProject(req.body);
      res.status(201).json(newProject);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ message: error.message });
    }
  }

  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const updatedProject = await projectService.updateProject(req.params.id, req.body);
      res.status(200).json(updatedProject);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ message: error.message });
    }
  }

  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      await projectService.deleteProject(req.params.id);
      res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}

export default new ProjectController();