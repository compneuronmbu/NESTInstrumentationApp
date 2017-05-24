import flask

app = flask.Flask(__name__)


@app.route('/NESTConnectionApp')
def index():
    return flask.render_template('NESTConnectionApp.html')


if __name__ == '__main__':
    app.run()
