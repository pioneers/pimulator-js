# Begin with the Python 3.4 image
FROM python:3.6.4

MAINTAINER Scott Numamoto <scott.numamoto@pioneers.berkeley.edu>

# Add the current directory to /code in the image
ADD requirements.txt /code/requirements.txt

# Set the working directory to /code
WORKDIR /code

# Install the Python dependencies
RUN pip install -r requirements.txt

# Expose default port
EXPOSE 5000

# Set the default command
CMD ["python", "app.py"]
