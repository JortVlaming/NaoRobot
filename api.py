import threading

from flask import Flask, Response, request, render_template, url_for
from naoqi import ALProxy
from flask_cors import CORS, cross_origin

robotIP = "192.168.2.196"
robotPort = 9559

# app = qi.Application(["--qi-url=tcp://" + robotIP + ":9559"])
# app.start()
# session = app.session

flask_app = Flask(__name__)
CORS(flask_app)

# stop robot connections
OFFLINE_MODE = True

@flask_app.route("/")
def main():
	return render_template("index.html")

__tts_service = None

def __get_proxy(name):
	if OFFLINE_MODE:
		return None
	return ALProxy(name, robotIP, robotPort)

def __get_tts():
	global __tts_service
	if __tts_service is not None:
		return __tts_service

	__tts_service = __get_proxy("ALTextToSpeech")

	return __tts_service


def say_something(args):
	_tts = __get_tts()

	if not _tts:
		print("Unable to use tts!")
		return

	if not args:
		print("No arguments to say.")
		return

	s = " ".join(str(arg) for arg in args if arg is not None)

	if not s.strip():
		print("No valid text to say.")
		return

	print("Saying: " + s)
	_tts.say(s)



@flask_app.route("/api/blocks", methods=["POST"])
@cross_origin()
def run():
	data = request.get_json()

	print data

	if "commands" not in data:
		return Response(status=400)

	for command in data["commands"]:
		type = command["type"]

		if type == "say_something":
			say_something(command["args"])

	return Response(status=200)

if __name__ == "__main__":
	flask_app.run(debug=True)
