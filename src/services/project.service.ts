import Project from '../models/project.model.js';
import { AppError } from '../utils/AppError.js';

class ProjectService {
  // Fetch all projects
  async getAllProjects() {
    try {
      return await Project.find();
    } catch (error) {
      throw new AppError('Error fetching projects', 500, error.message);
    }
  }

  // Fetch a single project by ID
  async getProjectById(id) {
    try {
      const project = await Project.findById(id);
      if (!project) {
        throw new AppError('Project not found', 404);
      }
      return project;
    } catch (error) {
      throw new AppError('Error fetching project', 500, error.message);
    }
  }

  // Create a new project
  async createProject(projectData) {
    try {
      const newProject = new Project(projectData);
      return await newProject.save();
    } catch (error) {
      throw new AppError('Error creating project', 400, error.message);
    }
  }

  // Update a project by ID
  async updateProject(id, projectData) {
    try {
      const updatedProject = await Project.findByIdAndUpdate(id, projectData, { new: true });
      if (!updatedProject) {
        throw new AppError('Project not found', 404);
      }
      return updatedProject;
    } catch (error) {
      throw new AppError('Error updating project', 400, error.message);
    }
  }

  // Delete a project by ID
  async deleteProject(id) {
    try {
      const deletedProject = await Project.findByIdAndDelete(id);
      if (!deletedProject) {
        throw new AppError('Project not found', 404);
      }
      return deletedProject;
    } catch (error) {
      throw new AppError('Error deleting project', 500, error.message);
    }
  }
}

export default new ProjectService();
