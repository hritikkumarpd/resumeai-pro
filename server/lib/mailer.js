const { Resend } = require('resend')

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.EMAIL_FROM || 'ResumeAI Pro <noreply@resumeaipro.com>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://resumeaihritik.vercel.app'

/* ── Email Templates ────────────────────────────────────────── */
function welcomeHtml(name) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: 'Inter', Arial, sans-serif; background: #080920; color: #F1F5F9; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: #111338; border-radius: 20px; overflow: hidden; border: 1px solid rgba(124,58,237,0.3); }
  .header { background: linear-gradient(135deg,#7C3AED,#06B6D4); padding: 36px; text-align: center; }
  .logo { font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -1px; }
  .body { padding: 36px; }
  h2 { color: #F1F5F9; font-size: 22px; margin: 0 0 12px; }
  p  { color: #94A3B8; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
  .btn { display: inline-block; background: linear-gradient(135deg,#7C3AED,#06B6D4); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; margin: 8px 0 24px; }
  .footer { text-align: center; padding: 24px; color: #475569; font-size: 12px; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ ResumeAI Pro</div>
    </div>
    <div class="body">
      <h2>Welcome, ${name || 'there'}! 🎉</h2>
      <p>You're now part of the world's smartest AI resume platform. Over <strong>4.3 million</strong> job seekers use ResumeAI Pro to land their dream jobs.</p>
      <p>Here's what you can do right now:</p>
      <ul style="color:#94A3B8;font-size:15px;line-height:2;padding-left:20px;">
        <li>🏗️ Build an ATS-optimized resume in minutes</li>
        <li>🎯 Check your resume's ATS score against any job</li>
        <li>✉️ Generate personalized cover letters with AI</li>
        <li>📄 Choose from 50+ premium templates</li>
      </ul>
      <a href="${FRONTEND_URL}/builder" class="btn">Start Building Your Resume →</a>
      <p style="font-size:13px;color:#475569;">Questions? Just reply to this email — we're here to help.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} ResumeAI Pro. All rights reserved.<br>You're receiving this because you signed up at resumeaipro.com</div>
  </div>
</body>
</html>`
}

function resetPasswordHtml(name, resetLink) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #080920; color: #F1F5F9; margin: 0; padding: 0; }
  .container { max-width: 520px; margin: 40px auto; background: #111338; border-radius: 20px; overflow: hidden; border: 1px solid rgba(124,58,237,0.3); }
  .header { background: linear-gradient(135deg,#7C3AED,#06B6D4); padding: 28px; text-align: center; }
  .logo { font-size: 22px; font-weight: 900; color: #fff; }
  .body { padding: 32px; }
  h2 { color: #F1F5F9; font-size: 20px; margin: 0 0 12px; }
  p  { color: #94A3B8; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
  .btn { display: inline-block; background: linear-gradient(135deg,#7C3AED,#06B6D4); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; }
  .footer { text-align: center; padding: 20px; color: #475569; font-size: 12px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><div class="logo">⚡ ResumeAI Pro</div></div>
    <div class="body">
      <h2>Reset your password</h2>
      <p>Hi ${name || 'there'}, we received a request to reset your ResumeAI Pro password.</p>
      <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetLink}" class="btn">Reset Password →</a>
      <p style="font-size:12px;color:#475569;margin-top:24px;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} ResumeAI Pro</div>
  </div>
</body>
</html>`
}

function subscriptionConfirmedHtml(name, plan) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #080920; color: #F1F5F9; margin: 0; padding: 0; }
  .container { max-width: 520px; margin: 40px auto; background: #111338; border-radius: 20px; overflow: hidden; border: 1px solid rgba(16,185,129,0.3); }
  .header { background: linear-gradient(135deg,#059669,#06B6D4); padding: 28px; text-align: center; }
  .logo { font-size: 22px; font-weight: 900; color: #fff; }
  .body { padding: 32px; }
  h2 { color: #F1F5F9; font-size: 20px; margin: 0 0 12px; }
  p  { color: #94A3B8; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
  .badge { display: inline-block; background: rgba(16,185,129,0.2); color: #10B981; border: 1px solid rgba(16,185,129,0.4); padding: 6px 16px; border-radius: 999px; font-weight: 700; font-size: 13px; margin-bottom: 20px; }
  .btn { display: inline-block; background: linear-gradient(135deg,#7C3AED,#06B6D4); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; }
  .footer { text-align: center; padding: 20px; color: #475569; font-size: 12px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><div class="logo">⚡ ResumeAI Pro</div></div>
    <div class="body">
      <div class="badge">✓ ${plan?.toUpperCase()} Plan Active</div>
      <h2>You're now a ${plan} member! 🎊</h2>
      <p>Hi ${name || 'there'}, your upgrade to <strong>ResumeAI Pro ${plan}</strong> is confirmed. You now have access to all premium features.</p>
      <ul style="color:#94A3B8;font-size:14px;line-height:2;padding-left:20px;">
        <li>✅ Unlimited resumes</li>
        <li>✅ All 50+ premium templates</li>
        <li>✅ AI Writing Assistant</li>
        <li>✅ Advanced ATS Checker</li>
        <li>✅ Cover Letter Generator</li>
        <li>✅ Priority Support</li>
      </ul>
      <a href="${FRONTEND_URL}/builder" class="btn">Start Building →</a>
    </div>
    <div class="footer">© ${new Date().getFullYear()} ResumeAI Pro</div>
  </div>
</body>
</html>`
}

/* ── Send Functions ─────────────────────────────────────────── */
async function sendWelcomeEmail(email, name) {
  if (!resend) return console.warn('Resend not configured — skipping welcome email')
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: '🎉 Welcome to ResumeAI Pro — let\'s build your dream career!',
    html: welcomeHtml(name),
  })
}

async function sendPasswordResetEmail(email, name, resetLink) {
  if (!resend) return console.warn('Resend not configured — skipping reset email')
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: '🔐 Reset your ResumeAI Pro password',
    html: resetPasswordHtml(name, resetLink),
  })
}

async function sendSubscriptionEmail(email, name, plan) {
  if (!resend) return console.warn('Resend not configured — skipping subscription email')
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `✨ Welcome to ResumeAI Pro ${plan} — all features unlocked!`,
    html: subscriptionConfirmedHtml(name, plan),
  })
}

module.exports = { sendWelcomeEmail, sendPasswordResetEmail, sendSubscriptionEmail }
