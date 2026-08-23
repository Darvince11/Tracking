const prisma = require('../config/prisma');
const AppError = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

class GroupTaskController {
  // Admin & Employee: View all group tasks
  static getGroupTasks = asyncHandler(async (req, res) => {
    const tasks = await prisma.groupTask.findMany({
      include: {
        members: { select: { id: true, firstName: true, lastName: true, department: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ status: 'success', data: { tasks } });
  });

  // Admin Only: Create a new group task
  static createGroupTask = asyncHandler(async (req, res) => {
    const { title, description, memberIds } = req.body;

    const task = await prisma.groupTask.create({
      data: {
        title,
        description,
        members: {
          connect: memberIds.map(id => ({ id }))
        }
      },
      include: { members: { select: { firstName: true, lastName: true } } }
    });

    res.status(201).json({ status: 'success', data: { task } });
  });

  // Admin Only: Update task or members
  static updateGroupTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, status, memberIds } = req.body;

    const updateData = { title, description, status };
    
    if (memberIds) {
      updateData.members = { set: memberIds.map(userId => ({ id: userId })) };
    }

    const task = await prisma.groupTask.update({
      where: { id },
      data: updateData,
      include: { members: { select: { firstName: true, lastName: true } } }
    });

    res.json({ status: 'success', data: { task } });
  });

  // Admin Only: Delete task
  static deleteGroupTask = asyncHandler(async (req, res) => {
    await prisma.groupTask.delete({ where: { id: req.params.id } });
    res.json({ status: 'success', message: 'Group task deleted' });
  });
}

module.exports = { GroupTaskController };
