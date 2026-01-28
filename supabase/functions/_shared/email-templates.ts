// Shared email templates for Family Desk
// All emails use consistent branding and styling

const BRAND_COLOR = "#47CC7B";
const BRAND_NAME = "Family Desk";
const LOGO_URL = "https://homemate.lovable.app/logo-family-desk-primary.png";

export interface EmailOptions {
  recipientName?: string;
  preheader?: string;
}

export function getEmailWrapper(content: string, options: EmailOptions = {}): string {
  const { recipientName, preheader } = options;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_NAME}</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, ${BRAND_COLOR} 0%, #3ba363 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .header img {
      width: 60px;
      height: 60px;
    }
    .header h1 {
      color: #ffffff;
      margin: 10px 0 0 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background: ${BRAND_COLOR};
      color: #ffffff !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .button:hover {
      background: #3ba363;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    .footer a {
      color: ${BRAND_COLOR};
      text-decoration: none;
    }
    .note {
      background-color: #f8f9fa;
      border-left: 4px solid ${BRAND_COLOR};
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
    }
    .divider {
      border: none;
      border-top: 1px solid #eeeeee;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="${BRAND_NAME}" />
      <h1>${BRAND_NAME}</h1>
    </div>
    <div class="content">
      ${recipientName ? `<p class="greeting">Hi ${recipientName},</p>` : ''}
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
      <p>
        <a href="https://homemate.lovable.app">Visit our website</a>
      </p>
    </div>
  </div>
</body>
</html>
`;
}

export function getButton(text: string, url: string): string {
  return `
    <div class="button-container">
      <a href="${url}" class="button">${text}</a>
    </div>
  `;
}

export function getNote(text: string): string {
  return `<div class="note">${text}</div>`;
}

// Email Templates

export function getVerificationEmailContent(verificationUrl: string): string {
  return `
    <p>Thank you for creating your Family Desk account! To get started, please verify your email address by clicking the button below.</p>
    
    ${getButton("Verify Email Address", verificationUrl)}
    
    ${getNote("This link will expire in 24 hours. If you didn't create a Family Desk account, you can safely ignore this email.")}
    
    <hr class="divider" />
    
    <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="font-size: 12px; word-break: break-all; color: #999;">${verificationUrl}</p>
  `;
}

export function getWelcomeEmailContent(dashboardUrl: string): string {
  return `
    <p>Welcome to Family Desk! 🎉</p>
    
    <p>Your email has been verified and you're all set to start managing your household. Here's what you can do:</p>
    
    <ul>
      <li><strong>Set up your household</strong> - Invite family members and configure preferences</li>
      <li><strong>Plan meals</strong> - Get AI-powered meal suggestions tailored to your family</li>
      <li><strong>Manage tasks</strong> - Keep track of household chores and assignments</li>
      <li><strong>Track habits</strong> - Build healthy routines together</li>
    </ul>
    
    ${getButton("Go to Dashboard", dashboardUrl)}
    
    <p>If you have any questions, we're here to help!</p>
  `;
}

export function getAccessRequestConfirmationContent(): string {
  return `
    <p>Thank you for requesting access to Family Desk!</p>
    
    <p>We've received your request and our team will review it shortly. You'll receive an email once your request has been processed.</p>
    
    ${getNote("Most requests are reviewed within 1-2 business days.")}
    
    <p>In the meantime, feel free to check out our features and how Family Desk can help your household stay organized.</p>
  `;
}

export function getAccessApprovedContent(signupUrl: string): string {
  return `
    <p>Great news! Your access request has been approved! 🎉</p>
    
    <p>You can now create your Family Desk account and start organizing your household.</p>
    
    ${getButton("Create Your Account", signupUrl)}
    
    <p>We're excited to have you join us!</p>
  `;
}

export function getAccessRejectedContent(reason?: string): string {
  return `
    <p>Thank you for your interest in Family Desk.</p>
    
    <p>After reviewing your access request, we're unable to approve it at this time.</p>
    
    ${reason ? getNote(`<strong>Reason:</strong> ${reason}`) : ''}
    
    <p>If you believe this was a mistake or would like to provide additional information, please feel free to submit a new request.</p>
    
    <p>We appreciate your understanding.</p>
  `;
}

export function getHouseholdInvitationContent(
  inviterName: string,
  householdName: string,
  role: string,
  acceptUrl: string
): string {
  return `
    <p>${inviterName} has invited you to join their household on Family Desk!</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Household:</strong> ${householdName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Your Role:</strong> ${role}</p>
    </div>
    
    ${getButton("Accept Invitation", acceptUrl)}
    
    <p>Once you accept, you'll be able to:</p>
    <ul>
      <li>View and manage shared tasks</li>
      <li>Access the family calendar</li>
      <li>Contribute to meal planning</li>
      <li>Track habits together</li>
    </ul>
    
    ${getNote("This invitation will expire in 7 days.")}
  `;
}

export function getJoinRequestNotificationContent(
  requesterName: string,
  requesterEmail: string,
  householdName: string,
  reviewUrl: string
): string {
  return `
    <p>Someone has requested to join your household on Family Desk.</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Name:</strong> ${requesterName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Email:</strong> ${requesterEmail}</p>
      <p style="margin: 10px 0 0 0;"><strong>Household:</strong> ${householdName}</p>
    </div>
    
    ${getButton("Review Request", reviewUrl)}
    
    <p>You can approve or decline this request from your household settings.</p>
  `;
}
