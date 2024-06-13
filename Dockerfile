# Use an official Node.js runtime as the base image
FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application files
COPY . .

# Expose the port that your app will run on
EXPOSE 3000

# Define the environment variable for port (optional, useful if your app uses PORT variable)
ENV PORT=3000

# Start the Node.js application
CMD ["node", "server.js"]
.
