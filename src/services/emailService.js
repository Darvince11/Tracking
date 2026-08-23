const nodemailer = require('nodemailer');
const prisma = require('../config/prisma');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Use live SMTP if credentials are provided in .env, regardless of NODE_ENV
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });
      console.log('📧 Email service connected to live SMTP server.');
    } else if (process.env.NODE_ENV !== 'production') {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 Using Ethereal Dev email inbox:', testAccount.user);
    } else {
      console.warn('SMTP is not configured; email notifications are disabled.');
      return;
    }

    this.initialized = true;
  }

  getTemplateStyles() {
    return `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f6fa; }
      .container { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      .header { background: #4a90e2; color: white; padding: 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; }
      .header.blocked { background: #e74c3c; }
      .header.warning { background: #f39c12; }
      .header.critical { background: #dc3545; }
      .content { padding: 24px; }
      .ticket-box { background: #f0f2f5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #4a90e2; }
      .button { display: inline-block; padding: 12px 28px; background: #4a90e2; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0; font-weight: 600; }
      .button.red { background: #e74c3c; }
      .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e1e4e8; font-size: 12px; color: #8e8ea0; text-align: center; }
      .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 8px; margin: 12px 0; }
      .alert.danger { background: #f8d7da; border-color: #dc3545; color: #721c24; }
      .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f2f5; }
      .info-label { color: #8e8ea0; font-weight: 500; }
      .info-value { color: #1a1a2e; font-weight: 600; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
      .badge-urgent { background: #e74c3c; color: white; }
      .badge-high { background: #e67e22; color: white; }
      .code { background: #f0f2f5; padding: 4px 10px; border-radius: 4px; font-family: monospace; font-size: 14px; }
    `;
  }

  buildEmailHTML(templateName, data) {
    const styles = this.getTemplateStyles();
    const appName = 'Nexoratel';
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const templates = {
      TICKET_ASSIGNED: `
        <div class="header"><h1>🎫 Ticket Assigned</h1></div>
        <div class="content">
          <p>Hello <strong>${data.assigneeName}</strong>,</p>
          <p>A new ticket has been assigned to you:</p>
          <div class="ticket-box">
            <h2 style="margin:0 0 8px 0;">${data.ticketTitle}</h2>
            <div class="info-row"><span class="info-label">Tracking #</span><span class="info-value">${data.trackingNumber}</span></div>
            <div class="info-row"><span class="info-label">Priority</span><span class="info-value">${data.priority}</span></div>
            <div class="info-row"><span class="info-label">Deadline</span><span class="info-value">${data.deadline || 'Not set'}</span></div>
            <div class="info-row"><span class="info-label">Estimated Hours</span><span class="info-value">${data.estimatedHours}h</span></div>
          </div>
          <a href="${appUrl}/tickets/${data.ticketId}" class="button">View Ticket</a>
        </div>
      `,

      TICKET_BLOCKED: `
        <div class="header blocked"><h1>🚫 Ticket Blocked</h1></div>
        <div class="content">
          <div class="alert danger"><strong>⚠️ A ticket has been blocked and requires immediate attention!</strong></div>
          <div class="ticket-box" style="border-left-color:#e74c3c;">
            <h2 style="margin:0 0 8px 0;">${data.ticketTitle}</h2>
            <div class="info-row"><span class="info-label">Tracking #</span><span class="info-value">${data.trackingNumber}</span></div>
            <div class="info-row"><span class="info-label">Blocked by</span><span class="info-value">${data.blockedBy}</span></div>
            <div class="info-row"><span class="info-label">Reason</span><span class="info-value">${data.blockReason}</span></div>
            <div class="info-row"><span class="info-label">Blocked since</span><span class="info-value">${data.blockedAt}</span></div>
          </div>
          <a href="${appUrl}/tickets/${data.ticketId}" class="button red">View Blocked Ticket</a>
        </div>
      `,

      DEADLINE_WARNING: `
        <div class="header warning"><h1>⏰ Deadline Approaching</h1></div>
        <div class="content">
          <div class="alert"><strong>Heads up!</strong> Your ticket deadline is approaching soon.</div>
          <div class="ticket-box" style="border-left-color:#f39c12;">
            <h2 style="margin:0 0 8px 0;">${data.ticketTitle}</h2>
            <div class="info-row"><span class="info-label">Tracking #</span><span class="info-value">${data.trackingNumber}</span></div>
            <div class="info-row"><span class="info-label">Deadline</span><span class="info-value">${data.deadline}</span></div>
            <div class="info-row"><span class="info-label">Hours Remaining</span><span class="info-value">${data.remainingHours}h</span></div>
            <div class="info-row"><span class="info-label">Progress</span><span class="info-value">${data.progress}%</span></div>
          </div>
          <a href="${appUrl}/tickets/${data.ticketId}" class="button">Continue Working</a>
        </div>
      `,

      SLA_BREACH: `
        <div class="header critical"><h1>🚨 SLA BREACHED</h1></div>
        <div class="content">
          <div class="alert danger"><strong>CRITICAL: Service Level Agreement has been breached!</strong></div>
          <div class="ticket-box" style="border-left-color:#dc3545;">
            <h2 style="margin:0 0 8px 0;">${data.ticketTitle}</h2>
            <div class="info-row"><span class="info-label">Tracking #</span><span class="info-value">${data.trackingNumber}</span></div>
            <div class="info-row"><span class="info-label">SLA Limit</span><span class="info-value">${data.slaHours}h</span></div>
            <div class="info-row"><span class="info-label">Time Elapsed</span><span class="info-value">${data.elapsedHours}h</span></div>
            <div class="info-row"><span class="info-label">Assigned To</span><span class="info-value">${data.assigneeName}</span></div>
          </div>
          <a href="${appUrl}/tickets/${data.ticketId}" class="button red">Take Immediate Action</a>
        </div>
      `,

      WELCOME: `
        <div class="header"><h1>👋 Welcome to ${appName}</h1></div>
        <div class="content">
          <p>Hello <strong>${data.firstName}</strong>,</p>
          <p>Your account has been created on the <strong>${appName}</strong> IT Tracking Platform.</p>
          <div class="ticket-box">
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${data.email}</span></div>
            <div class="info-row"><span class="info-label">Temporary Password</span><span class="info-value"><span class="code">${data.tempPassword}</span></span></div>
          </div>
          <div class="alert"><strong>🔒 Please change your password after your first login.</strong></div>
          <a href="${appUrl}/login" class="button">Login to ${appName}</a>
        </div>
      `,
    };

    return `<!DOCTYPE html><html><head><style>${styles}</style></head><body><div class="container">${templates[templateName] || ''}<div class="footer"><p>${appName} IT Tracking Platform</p><p>This is an automated notification. Please do not reply to this email.</p></div></div></body></html>`;
  }

  async sendEmail({ to, subject, html, userId, ticketId, type }) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.initialize();

        if (!this.transporter) throw new Error('Email delivery is not configured');

        const mailOptions = {
          from: `"Nexoratel" <${process.env.SMTP_FROM || 'noreply@nexoratel.com'}>`,
          to,
          subject,
          html,
        };

        const info = await this.transporter.sendMail(mailOptions);

        await prisma.notificationLog.create({
          data: {
            userId,
            ticketId,
            type,
            channel: 'EMAIL',
            subject,
            content: html,
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
          console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }

        return { success: true, messageId: info.messageId };

      } catch (error) {
        lastError = error;
        console.error(`Email attempt ${attempt} failed:`, error.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * attempt * 1000));
        }
      }
    }

    await prisma.notificationLog.create({
      data: {
        userId,
        ticketId,
        type,
        channel: 'EMAIL',
        subject,
        content: html,
        status: 'FAILED',
        error: lastError?.message,
      },
    });

    return { success: false, error: lastError?.message };
  }

  async notifyTicketAssigned(ticket, assignee) {
    return this.sendEmail({
      to: assignee.email,
      subject: `[Nexoratel] Ticket Assigned: ${ticket.trackingNumber}`,
      html: this.buildEmailHTML('TICKET_ASSIGNED', {
        assigneeName: `${assignee.firstName} ${assignee.lastName}`,
        trackingNumber: ticket.trackingNumber,
        ticketTitle: ticket.title,
        ticketId: ticket.id,
        priority: ticket.priority,
        deadline: ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : 'Not set',
        estimatedHours: ticket.estimatedHours,
      }),
      userId: assignee.id,
      ticketId: ticket.id,
      type: 'TICKET_ASSIGNED',
    });
  }

  async notifyTicketBlocked(ticket, blockedByUser) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', accountStatus: 'ACTIVE', deletedAt: null },
      select: { id: true, email: true },
    });

    const html = this.buildEmailHTML('TICKET_BLOCKED', {
      trackingNumber: ticket.trackingNumber,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      blockedBy: `${blockedByUser.firstName} ${blockedByUser.lastName}`,
      blockReason: ticket.blockReason,
      blockedAt: new Date(ticket.blockedAt).toLocaleString(),
    });

    const results = await Promise.allSettled(
      admins.map(admin =>
        this.sendEmail({
          to: admin.email,
          subject: `[URGENT] Ticket Blocked: ${ticket.trackingNumber}`,
          html,
          userId: admin.id,
          ticketId: ticket.id,
          type: 'TICKET_BLOCKED',
        })
      )
    );

    return results;
  }

  async notifyDeadlineApproaching(ticket, assignee) {
    const remainingHours = Math.max(0,
      (new Date(ticket.deadline).getTime() - Date.now()) / (1000 * 60 * 60)
    );

    return this.sendEmail({
      to: assignee.email,
      subject: `[Reminder] Deadline Approaching: ${ticket.trackingNumber}`,
      html: this.buildEmailHTML('DEADLINE_WARNING', {
        trackingNumber: ticket.trackingNumber,
        ticketTitle: ticket.title,
        ticketId: ticket.id,
        deadline: new Date(ticket.deadline).toLocaleString(),
        remainingHours: Math.round(remainingHours),
        progress: ticket.estimatedHours > 0 ? Math.round((ticket.actualHours / ticket.estimatedHours) * 100) : 0,
      }),
      userId: assignee.id,
      ticketId: ticket.id,
      type: 'DEADLINE_WARNING',
    });
  }

  async notifySLAThreshold(ticket, assignee, level, timing) {
    const critical = level === 'critical';
    const remainingHours = Math.max(0, Math.ceil(timing.remainingHours));
    const percentage = Math.min(100, Math.round(timing.usagePercent));

    return this.sendEmail({
      to: assignee.email,
      subject: `[${critical ? 'Urgent' : 'Reminder'}] ${percentage}% of task time used: ${ticket.trackingNumber}`,
      html: this.buildEmailHTML('DEADLINE_WARNING', {
        trackingNumber: ticket.trackingNumber,
        ticketTitle: ticket.title,
        ticketId: ticket.id,
        deadline: new Date(timing.dueAt).toLocaleString(),
        remainingHours,
        progress: percentage,
      }),
      userId: assignee.id,
      ticketId: ticket.id,
      type: critical ? 'SLA_CRITICAL' : 'SLA_WARNING',
    });
  }

  async notifySLABreach(ticket, assignee) {
    const elapsedHours = Math.round((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60));

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', accountStatus: 'ACTIVE', deletedAt: null },
      select: { id: true, email: true },
    });

    const html = this.buildEmailHTML('SLA_BREACH', {
      trackingNumber: ticket.trackingNumber,
      ticketTitle: ticket.title,
      ticketId: ticket.id,
      slaHours: ticket.slaHours || ticket.estimatedHours || 24,
      elapsedHours,
      assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned',
    });

    const allRecipients = [];
    
    if (assignee && assignee.email) {
      allRecipients.push({ id: assignee.id, email: assignee.email });
    }

    admins.forEach(admin => {
      if (!assignee || admin.id !== assignee.id) {
        allRecipients.push(admin);
      }
    });

    const results = await Promise.allSettled(
      allRecipients.map(recipient =>
        this.sendEmail({
          to: recipient.email,
          subject: `[CRITICAL] SLA BREACHED: ${ticket.trackingNumber}`,
          html,
          userId: recipient.id,
          ticketId: ticket.id,
          type: 'SLA_BREACH',
        })
      )
    );

    return results;
  }

  async sendWelcomeEmail(user, tempPassword) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Nexoratel - Your Account Details',
      html: this.buildEmailHTML('WELCOME', {
        firstName: user.firstName,
        email: user.email,
        tempPassword,
      }),
      userId: user.id,
      type: 'WELCOME',
    });
  }
}

module.exports = new EmailService();
