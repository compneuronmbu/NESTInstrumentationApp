import flask

from flask import request

app = flask.Flask(__name__)


@app.route('/NESTConnectionApp')
def index():
    return flask.render_template('NESTConnectionApp.html')


@app.route('/selector', methods=['POST', 'GET'])
def add_blog_ajax():
    if request.method == 'POST':
        name = request.json['name']
        selection = request.json['selection']
        print(name)
        print(selection)

        getGIDs(name, selection)

        return name
        #blog = Blog(title, article)
        #db.session.add(blog)
        #db.session.commit()
        #return jsonify(title=title, article=article)


def getGIDs(name, selection):
    pass


if __name__ == '__main__':
    app.run()
