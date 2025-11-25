# Go-Live Checklist

This checklist tracks the final steps needed to prepare the Broos 2.0 application for production launch.

## Development & Deployment

- [x] **GitHub Repository**: Ensure the project is linked to a GitHub repository for version control and CI/CD.
- [x] **Local Setup**: Clone the project to a local development environment to enable robust E2E testing and development.

## Feature Enhancements & Legal

- [ ] **AI Enhancement**: Explore Google's Vertex AI for more advanced knowledge base implementations (e.g., using its native RAG capabilities) to improve the chatbot's contextual awareness and accuracy.
- [ ] **Privacy Policy**: Replace the placeholder privacy policy with a legally reviewed document that is fully compliant with GDPR, especially concerning the data of minors.
- [ ] **Parental Consent**: Implement a mechanism to obtain and verify parental consent for users under the age of 16, as required by GDPR.

## Testing & Stability

- [x] **Extended Test Automation**: Expand the local Playwright E2E test suite to cover all critical user flows, including chat interactions, dashboard data validation, and alert generation.

## Admin & Data Management

- [ ] **Dashboard Refactoring**: Remove the "Knowledge Base Stats" section from the club responsible's dashboard. Create a separate, global admin dashboard (future feature) to display these and other high-level application statistics.
- [x] **Data Storage Confirmation**: All application data (user profiles, chats, wellness scores, club/team info) is stored centrally in the Firestore database. File uploads (like avatars) are stored in Firebase Storage, with the reference URL saved in Firestore. This is confirmed.
