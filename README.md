
Built by https://www.blackbox.ai

---

# Ticket System Project

## Project Overview
The Ticket System Project is a web application designed to facilitate the management of support tickets within an organization. It includes an authentication page and displays account credentials for administrators and employees. The aim of the project is to provide an organized platform for support-related tasks, ensuring that users can access the necessary tools to manage queries effectively.

## Installation
To run the Ticket System Project locally, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone [repository-url]
   cd ticket-system
   ```

2. **Open the project in your web browser**:
   Simply open the `index.html` file in your preferred web browser to view the application.

## Usage
Once the project is running, you will be redirected to the authentication page (`auth.html`). Here, you can log in using the provided account credentials.

### Sample Credentials
- **Admin Account**:
  - Username: `admin`
  - Password: `admin123`
  
- **Employee Accounts**:
  - Username: `employee1`
    - Password: `employee123`
  - Username: `employee2`
    - Password: `employee123`
  - Username: `employee3`
    - Password: `employee123`

Make sure to change these passwords upon your first login to maintain security.

## Features
- Redirects automatically to the login page for easy access.
- Displays account credentials for both administrative and employee roles.
- Responsive and straightforward user interface for managing credentials.

## Dependencies
This project does not include external dependencies as showcased in the provided project files. It primarily uses HTML and internal styling.

## Project Structure
The project is organized as follows:

```
ticket-system/
│
├── index.html           # Main entry point that redirects to the login page
├── accounts.html        # Contains the account credentials for users
```

### File Descriptions
- **index.html**: The initial HTML file that automatically redirects users to the authentication page.
- **accounts.html**: This file lists the account credentials for both the admin and employees, formatted for clarity and usability.

## License
This project is open-source and available for public use. Please ensure you adhere to best practices concerning the handling of sensitive information such as user credentials.