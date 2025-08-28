# Lightweight static hosting using Nginx
FROM nginx:1.27-alpine

LABEL maintainer="you" description="Portfolio static site"

# Clean default content
RUN rm -rf /usr/share/nginx/html/*

# Copy static assets
COPY public/index.html /usr/share/nginx/html/index.html
COPY styles/ /usr/share/nginx/html/styles/
COPY scripts/ /usr/share/nginx/html/scripts/
COPY assets/ /usr/share/nginx/html/assets/

# Custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


