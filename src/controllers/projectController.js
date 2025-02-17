import projectService from '../services/projectService.js';

class ProjectController {
    async getAllProjects(req, res) {
        try {
            const projects = await projectService.getAllProjects();
            res.status(200).json(projects);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getProjectById(req, res) {
        try {
            const project = await projectService.getProjectById(req.params.id);
            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }
            res.status(200).json(project);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async createProject(req, res) {
        try {
            const newProject = await projectService.createProject(req.body);
            res.status(201).json(newProject);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async updateProject(req, res) {
        try {
            const updatedProject = await projectService.updateProject(req.params.id, req.body);
            if (!updatedProject) {
                return res.status(404).json({ message: 'Project not found' });
            }
            res.status(200).json(updatedProject);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    async deleteProject(req, res) {
        try {
            const deletedProject = await projectService.deleteProject(req.params.id);
            if (!deletedProject) {
                return res.status(404).json({ message: 'Project not found' });
            }
            res.status(200).json({ message: 'Project deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default new ProjectController();
