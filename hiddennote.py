import json
import os
import base64
import glob

import binascii
from captcha.image import ImageCaptcha
from redis import StrictRedis
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

from flask import Flask, render_template, session, abort, request, flash, redirect, \
    get_flashed_messages

app = Flask(__name__, template_folder="templates")

basepath = os.path.dirname(__file__)

with open(os.path.abspath(os.path.join(basepath, "config.json")), "r") as config:
    config = json.load(config)

app.secret_key = config["secret_key"]

# setup redis caching
redis = StrictRedis(host=config["redis"]["host"], port=config["redis"]["port"],
                    db=config["redis"]["db"])

image = ImageCaptcha(fonts=glob.glob("src/fonts/*.ttf"))


@app.route("/")
def index():
    """Entry point to the application. Shows the user the homepage."""
    string = base64.b64encode(str(int.from_bytes(os.urandom(12), byteorder="big")).encode("ascii")).decode("ascii")
    cap = ''.join([i for i in string if i.isalpha()])
    session["captcha"] = cap[:5]
    captcha = base64.b64encode(image.generate(session["captcha"]).getvalue()).decode("utf-8")
    return render_template("pages/index.html", captcha=captcha)

@app.route("/view/<id>")
def view(id):
    """Middleware for checking if decryption should be done client or server side."""
    return render_template("pages/view_middleware.html", id=id)


@app.route("/view/js/<id>")
def view_js(id):
    """User has JavaScript so we can decrypt on the client side."""
    if not redis.exists("hidden:{}:ciphertext".format(id)):
        abort(404)

    ciphertext = redis.get("hidden:{}:ciphertext".format(id))

    redis.delete("hidden:{}:ciphertext".format(id))

    return render_template("pages/view_js.html", ciphertext=ciphertext, id=id)


@app.route("/submit/nojs", methods=["POST"])
def submit_nojs():
    """The user submitted a note without JavaScript enabled. Encrypt at the server."""
    if not "captcha" in session or "captcha" not in request.form or "content" not in request.form:
        abort(404)

    if session["captcha"].lower() != request.form["captcha"].lower():
        flash("Invalid captcha.", "error")
        return redirect("/", code=303)

    key = base64.b64encode(str(int.from_bytes(os.urandom(16),
                                              byteorder="big")).encode('ascii'))[:32]
    id = base64.b64encode(str(int.from_bytes(os.urandom(10), byteorder="big")).encode('ascii'))[:16]
    iv = get_random_bytes(16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    data = request.form["content"].encode("utf-8")
    length = 16 - (len(data) % 16)
    data += bytes([length]) * length
    ciphertext = cipher.encrypt(data)
    redis.set("hidden:{}:ciphertext".format(id.decode('ascii')), base64.b64encode(iv + ciphertext))

    session.pop('captcha', None)

    flash(id.decode('ascii'), "post_id")
    flash(key.decode('ascii'), "post_key")
    return redirect("/complete", code=303)


@app.route("/submit/js", methods=["POST"])
def submit():
    """The user submitted a note with JavaScript enabled, must be already encrypted."""

    if not "captcha" in session or "captcha" not in request.form or "encrypted" not in request.form:
        abort(404)

    try:
        base64.decodebytes(request.form["encrypted"].encode('utf-8'))
    except binascii.Error:
        """Malformed base64 from the user. They've probably been messing with the req."""
        abort(404)

    if session["captcha"].lower() != request.form["captcha"].lower():
        flash("Invalid captcha.", "error")
        return redirect("/", code=303)

    id = base64.b64encode(str(int.from_bytes(os.urandom(10), byteorder="big")).encode('ascii'))[:16]
    redis.set("hidden:{}:ciphertext".format(id.decode('ascii')), request.form["encrypted"])

    session.pop('captcha', None)

    return json.dumps({"id": id.decode('ascii')})

@app.route("/complete")
def complete():
    """Show the user the link to their post."""
    if not get_flashed_messages(False, 'post_id') or not get_flashed_messages(False, 'post_key'):
        abort(404)

    id = get_flashed_messages(False, 'post_id')[0]
    key = get_flashed_messages(False, 'post_key')[0]
    return render_template("pages/complete.html", id=id, key=key)


if __name__ == '__main__':
    app.run()
