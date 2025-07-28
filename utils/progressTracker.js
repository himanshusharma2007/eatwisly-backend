// In-memory progress tracker for scan operations
class ProgressTracker {
    constructor() {
      this.tasks = new Map();
    }
  
    // Create a new task
    createTask(taskId) {
      this.tasks.set(taskId, {
        progress: 0,
        status: 'Initializing...',
        completed: false,
        result: null,
        error: null,
        createdAt: new Date()
      });
    }
  
    // Update task progress
    updateProgress(taskId, progress, status) {
      const task = this.tasks.get(taskId);
      if (task) {
        task.progress = progress;
        task.status = status;
        task.updatedAt = new Date();
      }
    }
  
    // Mark task as completed with result
    completeTask(taskId, result) {
      const task = this.tasks.get(taskId);
      if (task) {
        task.progress = 100;
        task.status = 'Complete';
        task.completed = true;
        task.result = result;
        task.updatedAt = new Date();
      }
    }
  
    // Mark task as failed with error
    failTask(taskId, error) {
      const task = this.tasks.get(taskId);
      if (task) {
        task.progress = 0;
        task.status = 'Failed';
        task.completed = true;
        task.error = error;
        task.updatedAt = new Date();
      }
    }
  
    // Get task status
    getTask(taskId) {
      return this.tasks.get(taskId);
    }
  
    // Cleanup old tasks (run periodically)
    cleanup() {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      for (const [taskId, task] of this.tasks.entries()) {
        if (task.createdAt < thirtyMinutesAgo) {
          this.tasks.delete(taskId);
        }
      }
    }
  
    // Generate unique task ID
    generateTaskId() {
      return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  }
  
  // Create singleton instance
  const progressTracker = new ProgressTracker();
  
  // Cleanup every 10 minutes
  setInterval(() => {
    progressTracker.cleanup();
  }, 10 * 60 * 1000);
  
  module.exports = progressTracker;