# Begin with the Python 3.4 image
FROM python:3.6.4

MAINTAINER Scott Numamoto <scott.numamoto@pioneers.berkeley.edu>

# Set the working directory to /code
WORKDIR /code

# Add the current directory to the working dir
ADD . .

# Install the Python dependencies
RUN pip install -r requirements.txt

# Expose default port
EXPOSE 5000

# Set the default command
CMD ["python", "-u", "app.py"]
