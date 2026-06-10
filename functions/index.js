const {setGlobalOptions} = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret, defineString} = require("firebase-functions/params");
const nodemailer = require("nodemailer");
const logger = require("firebase-functions/logger");

setGlobalOptions({maxInstances: 10});

// Define parameters that can be configured via Firebase CLI
const gmailEmail = defineString("GMAIL_EMAIL", {
  description: "The personal Gmail address to send notifications from.",
});
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

exports.sendNotificationEmail = onDocumentCreated(
    {
      document: "notifications/{docId}",
      secrets: [gmailAppPassword],
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;

      const data = snap.data();

      // Ensure it hasn't been processed yet
      if (data.processed) return;

      // Check if it has 'to' and 'message' (the generic email format)
      if (!data.to || !data.message) {
        logger.error("Invalid notification document format", {
          docId: event.params.docId,
        }); return;
      }

      const emailUser = gmailEmail.value();
      const emailPass = gmailAppPassword.value();

      if (!emailUser || !emailPass) {
        logger.error(
            "Gmail credentials are not configured in Firebase secrets/params.",
        ); return;
      }

      // Configure Nodemailer for Gmail
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

      const mailOptions = {
        from: `"Vanpool Coordinator" <${emailUser}>`,
        to: data.to,
        subject: data.message.subject,
        text: data.message.text,
        html: data.message.html,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent: ${info.messageId}`);

        // Update the document to mark as processed
        await snap.ref.update({
          processed: true,
          processedAt: new Date(),
          messageId: info.messageId,
        });
      } catch (error) {
        logger.error("Error sending email", error);
        await snap.ref.update({
          processed: false,
          error: error.message,
        });
      }
    },
);
