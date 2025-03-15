import Project, { IProject } from '../models/project.model';
import { AppError } from '../utils/AppError';

// Define the response types for the project
export interface ProjectData {
  featuredProjects: IProject[];
  recentProjects: IProject[];
  projectsByCategory: Record<string, IProject[]>;
}

export interface ProjectOptions {
  featuredLimit?: number;
  recentLimit?: number;
  categories?: string[];
}

class ProjectService {
  // Main method to get all project data in a single call
  async getProjectData(options: ProjectOptions = {}): Promise<ProjectData> {
    try {
      const { featuredLimit = 3, recentLimit = 6, categories = [] } = options;
      
      // Use Promise.all to parallelize the database queries
      const [featuredProjects, recentProjects, projectsByCategory] = await Promise.all([
        this.getFeaturedProjects(featuredLimit),
        this.getRecentProjects(recentLimit),
        this.getProjectsByCategories(categories),
      ]);
      
      return {
        featuredProjects,
        recentProjects,
        projectsByCategory,
      };
    } catch (error: any) {
      throw new AppError('Error fetching project data', 500, error.message);
    }
  }

  // Get featured projects for project
  async getFeaturedProjects(limit: number = 3): Promise<IProject[]> {
    try {
      return await Project.find({ featured: true, available: true })
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(limit)
        .lean(); // Use lean() for better performance
    } catch (error: any) {
      throw new AppError('Error fetching featured projects', 500, error.message);
    }
  }

  // Get most recent projects
  async getRecentProjects(limit: number = 6): Promise<IProject[]> {
    try {
      return await Project.find({ available: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error: any) {
      throw new AppError('Error fetching recent projects', 500, error.message);
    }
  }

  // Get projects grouped by categories
  async getProjectsByCategories(categories: string[] = []): Promise<Record<string, IProject[]>> {
    try {
      const query = { available: true };
      
      // If specific categories are requested, filter by them
      if (categories.length > 0) {
        (query as any).category = { $in: categories };
      }
      
      const projects = await Project.find(query).lean();
      
      // Group projects by category
      const projectsByCategory: Record<string, IProject[]> = {};
      
      projects.forEach(project => {
        if (!projectsByCategory[project.category]) {
          projectsByCategory[project.category] = [];
        }
        projectsByCategory[project.category].push(project);
      });
      
      return projectsByCategory;
    } catch (error: any) {
      throw new AppError('Error fetching projects by categories', 500, error.message);
    }
  }

  // Method to get a single project by ID (for project details page)
  async getProjectById(id: string): Promise<IProject> {
    try {
      const project = await Project.findById(id);
      if (!project) {
        throw new AppError('Project not found', 404);
      }
      return project;
    } catch (error: any) {
      throw new AppError('Error fetching project', 500, error.message);
    }
  }

  // Project CRUD methods (kept for completeness)
  async getAllProjects(): Promise<IProject[]> {
    try {
      return await Project.find();
    } catch (error: any) {
      throw new AppError('Error fetching projects', 500, error.message);
    }
  }

  async createProject(projectData: Partial<IProject>): Promise<IProject> {
    try {
      const newProject = new Project(projectData);
      return await newProject.save();
    } catch (error: any) {
      throw new AppError('Error creating project', 400, error.message);
    }
  }

  async updateProject(id: string, projectData: Partial<IProject>): Promise<IProject | null> {
    try {
      const updatedProject = await Project.findByIdAndUpdate(id, projectData, { new: true });
      if (!updatedProject) {
        throw new AppError('Project not found', 404);
      }
      return updatedProject;
    } catch (error: any) {
      throw new AppError('Error updating project', 400, error.message);
    }
  }

  async deleteProject(id: string): Promise<IProject | null> {
    try {
      const deletedProject = await Project.findByIdAndDelete(id);
      if (!deletedProject) {
        throw new AppError('Project not found', 404);
      }
      return deletedProject;
    } catch (error: any) {
      throw new AppError('Error deleting project', 500, error.message);
    }
  }
}

export default new ProjectService();
