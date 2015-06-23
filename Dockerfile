FROM ubuntu
RUN apt-get update
RUN apt-get install -y git nodejs npm
RUN git clone git://github.com/DuoSoftware/DVP-HTTPProgrammingAPI.git /usr/local/src/httpprogrammingapi
RUN cd /usr/local/src/httpprogrammingapi; npm install
CMD ["nodejs", "/usr/local/src/httpprogrammingapi/app.js"]

EXPOSE 8807