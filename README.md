# InfoAmazonia Colombia

Colombia deforestation data dashboard and environmental news.

## Dependencies

 - node v0.12.x or v4.x
 - npm 2.15.x

## Installation

```
$ sudo npm install -g grunt-cli bower
$ git clone https://github.com/InfoAmazonia/infoamazonia-colombia.git
$ cd infoamazonia-colombia
$ npm install && bower install
$ grunt build
```

## Running the app

App files are built into the `public/` directory, which can be linked or copied to a web server (apache/nginx).

For development you can use python's http server:

```
$ cd public
$ python -m SimpleHTTPServer
```

Access http://localhost:8000

## Deploy on [Github Pages](https://pages.github.com/)

Forking the repository allows you to automatically deploy the app into Gihub Pages.

```
$ grunt deploy
```

Access http://[user].github.io/infoamazonia-colombia/

[Learn more about Github Pages](https://pages.github.com/)
