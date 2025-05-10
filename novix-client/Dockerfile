# Use an official Node.js runtime as a parent image
FROM node:23-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Build the Vite app
RUN yarn build

# Expose the port the app runs on
EXPOSE 5173

# Define the command to run the app
CMD ["yarn", "preview"]
