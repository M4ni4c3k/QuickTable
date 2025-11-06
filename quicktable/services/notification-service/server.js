import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3006;

// Configure email transporter (using Gmail as example, can be configured for other providers)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify email configuration
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify((error, success) => {
    if (error) {
      console.log('⚠️ Notification Service: Email configuration error:', error.message);
      console.log('   Notifications will be logged but not sent');
    } else {
      console.log('✅ Notification Service: Email server ready');
    }
  });
} else {
  console.log('⚠️ Notification Service: Email credentials not configured');
  console.log('   Set EMAIL_USER and EMAIL_PASS environment variables');
  console.log('   Notifications will be logged but not sent');
}

// Email templates
const emailTemplates = {
  reservationConfirmation: (reservation) => ({
    subject: `Potwierdzenie rezerwacji - Stolik ${reservation.tableNumber}`,
    html: `
      <h2>Dziękujemy za rezerwację!</h2>
      <p>Twoja rezerwacja została przyjęta i oczekuje na potwierdzenie.</p>
      <h3>Szczegóły rezerwacji:</h3>
      <ul>
        <li><strong>Imię i nazwisko:</strong> ${reservation.customerName}</li>
        <li><strong>Stolik:</strong> ${reservation.tableNumber}</li>
        <li><strong>Data:</strong> ${reservation.reservationDate}</li>
        <li><strong>Godzina:</strong> ${reservation.reservationHour}</li>
        <li><strong>Liczba gości:</strong> ${reservation.guests}</li>
      </ul>
      <p>Status: <strong>Oczekująca na potwierdzenie</strong></p>
      <p>Skontaktujemy się z Tobą wkrótce w celu potwierdzenia rezerwacji.</p>
    `
  }),
  reservationAccepted: (reservation) => ({
    subject: `Rezerwacja potwierdzona - Stolik ${reservation.tableNumber}`,
    html: `
      <h2>Twoja rezerwacja została potwierdzona!</h2>
      <h3>Szczegóły rezerwacji:</h3>
      <ul>
        <li><strong>Stolik:</strong> ${reservation.tableNumber}</li>
        <li><strong>Data:</strong> ${reservation.reservationDate}</li>
        <li><strong>Godzina:</strong> ${reservation.reservationHour}</li>
        <li><strong>Liczba gości:</strong> ${reservation.guests}</li>
      </ul>
      <p>Z niecierpliwością oczekujemy na Twoją wizytę!</p>
    `
  }),
  reservationRejected: (reservation) => ({
    subject: `Rezerwacja - Stolik ${reservation.tableNumber}`,
    html: `
      <h2>Niestety, nie możemy przyjąć Twojej rezerwacji</h2>
      <p>Twoja prośba o rezerwację stolika ${reservation.tableNumber} na ${reservation.reservationDate} o ${reservation.reservationHour} nie może zostać przyjęta.</p>
      <p>Skontaktuj się z nami, aby znaleźć alternatywny termin.</p>
    `
  })
};

// POST /notifications/email - Send email notification
app.post('/notifications/email', async (req, res) => {
  try {
    const { to, type, data } = req.body;
    
    if (!to || !type) {
      return res.status(400).json({ error: 'Missing required fields: to, type' });
    }
    
    let emailContent;
    
    switch (type) {
      case 'reservation-confirmation':
        if (!data.reservation) {
          return res.status(400).json({ error: 'Missing reservation data' });
        }
        emailContent = emailTemplates.reservationConfirmation(data.reservation);
        break;
        
      case 'reservation-accepted':
        if (!data.reservation) {
          return res.status(400).json({ error: 'Missing reservation data' });
        }
        emailContent = emailTemplates.reservationAccepted(data.reservation);
        break;
        
      case 'reservation-rejected':
        if (!data.reservation) {
          return res.status(400).json({ error: 'Missing reservation data' });
        }
        emailContent = emailTemplates.reservationRejected(data.reservation);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@quicktable.com',
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };
    
    // Only send if email is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent: ${info.messageId} to ${to}`);
        res.json({ 
          success: true, 
          messageId: info.messageId,
          message: 'Email sent successfully'
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        res.status(500).json({ error: 'Failed to send email', details: emailError.message });
      }
    } else {
      // Log notification for development
      console.log('📧 [DEV] Would send email:', {
        to,
        type,
        subject: emailContent.subject
      });
      res.json({ 
        success: true, 
        message: 'Email logged (email not configured)',
        dev: true
      });
    }
  } catch (error) {
    console.error('Error processing notification:', error);
    res.status(500).json({ error: 'Failed to process notification' });
  }
});

// GET /notifications/health - Health check
app.get('/health', (req, res) => {
  const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  res.json({ 
    status: 'ok', 
    service: 'notification-service',
    emailConfigured
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Notification Service running on port ${PORT}`);
});



