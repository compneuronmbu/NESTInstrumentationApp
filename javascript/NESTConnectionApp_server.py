from __future__ import print_function
import pprint
import flask

app = flask.Flask(__name__)


@app.route('/NESTConnectionApp')
def index():
    return flask.render_template('NESTConnectionApp.html')


@app.route('/selector', methods=['POST', 'GET'])
def add_blog_ajax():
    if flask.request.method == 'POST':
        pp = pprint.PrettyPrinter(indent=4)
        name = flask.request.json['name']
        selection = flask.request.json['selection']
        # print(name)
        # print(selection)
        pp.pprint(flask.request.json)

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
