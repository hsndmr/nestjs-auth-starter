# NestJS Auth Starter
The NestJS Auth Starter project is a starter project for [NestJS](https://nestjs.com/) that provides authentication and authorization functionality out of the box. It is built on top of the popular NestJS framework and uses the [mongoose](https://mongoosejs.com/) library to access the database. For authentication and authorization, it relies on the powerful [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) library, while password hashing is performed using [bcrypt](https://www.npmjs.com/package/bcrypt). Additionally, the project utilizes the [xstate](https://xstate.js.org/) library for state management in authentication cases, and includes tests for all cases. With this starter project, developers can quickly set up a secure and robust authentication system in their NestJS applications.

# Install the dependencies for the Nest application:
```bash
npm install
```

# Create .env file from .env.example and:

```bash
cp .env.example .env
```

# Open .env file and add your Mongo URI and JWT Secret
```bash
MONGO_URI=Mongo_uri
JWT_SECRET=secret
```

# Run the application:
```bash
npm run start

# watch mode
npm run start:dev
```

# Open api documentation:
```bash
http://localhost:3000/api
```
