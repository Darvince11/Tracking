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
      html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; background: #f1f5f9; }
      body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #172033; line-height: 1.6; -webkit-font-smoothing: antialiased; }
      table { border-collapse: collapse; border-spacing: 0; }
      img { border: 0; display: block; }
      a { color: #2563eb; }
      .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; mso-hide: all; }
      .email-shell { width: 100%; background: #f1f5f9; padding: 36px 12px; }
      .container { width: 100%; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.10); }
      .brand { padding: 22px 32px; background: #0f172a; color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.3px; }
      .brand-mark { display: inline-block; width: 30px; height: 30px; line-height: 30px; margin-right: 10px; border-radius: 9px; background: #3b82f6; text-align: center; vertical-align: middle; color: #ffffff; font-size: 15px; }
      .brand-name { vertical-align: middle; }
      .header { padding: 36px 32px 30px; background: #eff6ff; color: #1e3a8a; border-top: 1px solid #dbeafe; }
      .header h1 { margin: 0; font-size: 27px; line-height: 1.25; letter-spacing: -0.6px; }
      .header.blocked, .header.critical { background: #fff1f2; color: #9f1239; border-top-color: #ffe4e6; }
      .header.warning { background: #fffbeb; color: #92400e; border-top-color: #fef3c7; }
      .content { padding: 30px 32px 34px; font-size: 15px; }
      .content p { margin: 0 0 16px; }
      .ticket-box { background: #f8fafc; padding: 20px; border-radius: 14px; margin: 22px 0; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; }
      .ticket-box h2 { color: #0f172a; font-size: 19px; line-height: 1.35; }
      .button { display: inline-block; padding: 13px 22px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 10px; margin: 6px 0 0; font-weight: 700; font-size: 14px; box-shadow: 0 6px 14px rgba(37, 99, 235, 0.22); }
      .button.red { background: #e11d48; box-shadow: 0 6px 14px rgba(225, 29, 72, 0.20); }
      .footer { padding: 24px 32px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; line-height: 1.6; color: #64748b; text-align: center; }
      .footer p { margin: 3px 0; }
      .footer strong { color: #334155; }
      .alert { background: #fffbeb; border: 1px solid #fde68a; color: #854d0e; padding: 14px 16px; border-radius: 12px; margin: 0 0 20px; }
      .alert.danger { background: #fff1f2; border-color: #fecdd3; color: #9f1239; }
      .info-row { display: table; width: 100%; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
      .info-row:last-child { border-bottom: 0; padding-bottom: 0; }
      .info-label, .info-value { display: table-cell; vertical-align: top; }
      .info-label { width: 42%; color: #64748b; font-weight: 500; }
      .info-value { color: #172033; font-weight: 700; text-align: right; word-break: break-word; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; }
      .badge-urgent { background: #ffe4e6; color: #be123c; }
      .badge-high { background: #ffedd5; color: #c2410c; }
      .code { display: inline-block; background: #e2e8f0; color: #0f172a; padding: 6px 10px; border-radius: 7px; font-family: Consolas, Monaco, monospace; font-size: 14px; letter-spacing: .3px; }
      @media only screen and (max-width: 640px) {
        .email-shell { padding: 0 !important; }
        .container { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
        .brand, .header, .content, .footer { padding-left: 22px !important; padding-right: 22px !important; }
        .header h1 { font-size: 23px !important; }
        .info-label, .info-value { display: block !important; width: 100% !important; text-align: left !important; }
        .info-value { padding-top: 2px !important; }
        .button { display: block !important; text-align: center !important; }
      }
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

    const preheaders = {
      TICKET_ASSIGNED: `A new ticket has been assigned to you in ${appName}.`,
      TICKET_BLOCKED: 'A blocked ticket requires attention.',
      DEADLINE_WARNING: 'A ticket deadline or SLA threshold is approaching.',
      SLA_BREACH: 'Immediate action is required for an SLA breach.',
      WELCOME: `Your ${appName} account is ready.`
    };

    return `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="x-apple-disable-message-reformatting">
          <title>${appName} notification</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="preheader">${preheaders[templateName] || `${appName} notification`}</div>
          <table role="presentation" class="email-shell" width="100%">
            <tr>
              <td align="center">
                <div class="container">
                  <div class="brand"><span class="brand-mark">N</span><span class="brand-name">${appName}</span></div>
                  ${templates[templateName] || ''}
                  <div class="footer">
                    <p><strong>${appName} IT Operations</strong></p>
                    <p>This automated notification was sent because of activity on your account.</p>
                    <p>Please do not reply to this email.</p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
      </html>`;
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
