import prisma from '../config/db';
import logger from '../utils/logger';
import { randomUUID } from 'crypto';

export class TrainingService {
  static async listCourses(organizationId: string) {
    return await prisma.training_courses.findMany({
      where: { organizationId },
      orderBy: { created_at: 'desc' }
    });
  }

  static async createCourse(organizationId: string, data: any) {
    return await prisma.training_courses.create({
      data: {
        id: randomUUID(),
        organizationId,
        title: data.title,
        description: data.description,
        framework_tags: data.framework_tags || [],
        duration_minutes: parseInt(data.duration_minutes || '30'),
        is_mandatory: data.is_mandatory || false
      }
    });
  }

  static async updateCourse(organizationId: string, courseId: string, data: any) {
    return await prisma.training_courses.update({
      where: { id: courseId, organizationId },
      data: {
        title: data.title,
        description: data.description,
        framework_tags: data.framework_tags,
        duration_minutes: parseInt(data.duration_minutes || '30'),
        is_mandatory: data.is_mandatory
      }
    });
  }

  static async deleteCourse(organizationId: string, courseId: string) {
    return await prisma.training_courses.delete({
      where: { id: courseId, organizationId }
    });
  }

  static async recordCompletion(organizationId: string, courseId: string, userId: string, score?: number, notes?: string) {
    const completion = await prisma.training_completions.create({
      data: {
        id: randomUUID(),
        organizationId,
        course_id: courseId,
        user_id: userId,
        score: score ? parseInt(score as any) : null,
        passed: score !== undefined ? score >= 70 : true,
        notes: notes || null
      }
    });

    // Check mandatory compliance gaps
    await this.checkAndTriggerCompetenceCompliance(organizationId);

    return completion;
  }

  static async getUserCompletions(organizationId: string, userId: string) {
    return await prisma.training_completions.findMany({
      where: { organizationId, user_id: userId },
      include: { course: true }
    });
  }

  static async getCompletionStatus(organizationId: string) {
    const [courses, users, completions] = await Promise.all([
      prisma.training_courses.findMany({ where: { organizationId } }),
      prisma.users.findMany({ where: { organizationId, is_active: true } }),
      prisma.training_completions.findMany({ where: { organizationId } })
    ]);

    return courses.map(course => {
      const courseCompletions = completions.filter(c => c.course_id === course.id);
      const completedUserIds = new Set(courseCompletions.map(c => c.user_id));
      const totalUsers = users.length;
      const completedCount = completedUserIds.size;
      const percentage = totalUsers > 0 ? Math.round((completedCount / totalUsers) * 100) : 0;

      return {
        id: course.id,
        title: course.title,
        is_mandatory: course.is_mandatory,
        framework_tags: course.framework_tags,
        duration_minutes: course.duration_minutes,
        completedCount,
        totalUsers,
        percentage
      };
    });
  }

  static async getMandatoryComplianceGap(organizationId: string) {
    const [mandatoryCourses, users, completions] = await Promise.all([
      prisma.training_courses.findMany({ where: { organizationId, is_mandatory: true } }),
      prisma.users.findMany({ where: { organizationId, is_active: true } }),
      prisma.training_completions.findMany({ where: { organizationId } })
    ]);

    const gaps: Array<{ courseId: string; courseTitle: string; userId: string; userEmail: string; userName: string }> = [];

    for (const course of mandatoryCourses) {
      const completedUserIds = new Set(
        completions.filter(c => c.course_id === course.id && c.passed).map(c => c.user_id)
      );

      for (const user of users) {
        if (!completedUserIds.has(user.id)) {
          gaps.push({
            courseId: course.id,
            courseTitle: course.title,
            userId: user.id,
            userEmail: user.email,
            userName: user.full_name
          });
        }
      }
    }

    return gaps;
  }

  private static async checkAndTriggerCompetenceCompliance(organizationId: string) {
    try {
      const gaps = await this.getMandatoryComplianceGap(organizationId);
      
      // If there is zero compliance gap in mandatory courses, update ISO 42001 Clause 7 control status
      if (gaps.length === 0) {
        logger.info(`Mandatory training courses complete with zero gaps in org ${organizationId}. Marking ISO 42001 Clause 7 (Support/Competence) to IMPLEMENTED.`);
        
        const control = await prisma.iso42001_controls.findFirst({
          where: { control_code: { contains: 'Clause-7' } }
        }) || await prisma.iso42001_controls.findFirst({
          where: { control_code: { contains: '7' } }
        });

        if (control) {
          await prisma.iso42001_implementations.upsert({
            where: {
              organizationId_control_id: {
                organizationId,
                control_id: control.id
              }
            },
            update: { status: 'IMPLEMENTED' },
            create: {
              organizationId,
              control_id: control.id,
              status: 'IMPLEMENTED',
              notes: 'Auto-implemented by Sentraa Training Register (zero mandatory compliance gaps).'
            }
          });
          
          // Re-sync standard posture snap
          const { Iso42001Service } = require('./iso42001.service');
          await Iso42001Service.syncComplianceSnapshot(organizationId);
        }
      }
    } catch (err) {
      logger.error('Failed to trigger ISO 42001 competence autolink:', err);
    }
  }
}
