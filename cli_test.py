import math

from naoqi import ALProxy

robotIP = "192.168.2.196"
robotPort = 9559

def StiffnessOn(proxy, stiffness=1.0):
	# We use the "Body" name to signify the collection of all joints
	pNames = "Body"
	pStiffnessLists = stiffness
	pTimeLists = 1.0
	proxy.stiffnessInterpolation(pNames, pStiffnessLists, pTimeLists)

tts = ALProxy("ALTextToSpeech", robotIP, robotPort)
motionProxy = ALProxy("ALMotion", robotIP, robotPort)
postureProxy = ALProxy("ALRobotPosture", robotIP, robotPort)
awarenessProxy = ALProxy("ALBasicAwareness", robotIP, robotPort)
autonomousProxy = ALProxy("ALAutonomousLife", robotIP, robotPort)

autonomousProxy.setState("disabled")
awarenessProxy.stopAwareness()
motionProxy.setIdlePostureEnabled("Body", False)

motionProxy.setWalkArmsEnabled(True, True)
motionProxy.setMotionConfig([["ENABLE_FOOT_CONTACT_PROTECTION", True]])

joints = motionProxy.getBodyNames("Body")
poses = postureProxy.getPostureList()

StiffnessOn(motionProxy)

while True:
	i = raw_input("> ")
	if i == "stop":
		break

	if i.startswith("tts"):
		tts.say(i.partition(' ')[2])
	elif i.startswith("joint"):
		if i == "joint":
			print joints
			continue
		args = i.split(" ")
		args = args[1:]
		if len(args) == 2:
			joint = args[0]
			if joint not in joints:
				print "Dat is geen optie!"
				continue
			angle = float(args[1])

			StiffnessOn(motionProxy)
			motionProxy.angleInterpolationWithSpeed(joint, [math.radians(angle)], 0.3)
			motionProxy.setIdlePostureEnabled("Body", False)
	elif i.startswith("stiffness"):
		if i == "stiffness":
			continue
		args = i.split(" ")
		args = args[1:]
		stiffness = float(args[0])
		StiffnessOn(motionProxy, stiffness)
	elif i.startswith("pose"):
		if i == "pose":
			print poses
			continue
		args = i.split(" ")
		args = args[1:]

		if args[0] not in poses:
			print "Dat is geen optie!"
			continue

		postureProxy.goToPosture(args[0], 0.5 if len(args) == 1 else float(args[1]))
	elif i.startswith("brain"):
		if i == "brain":
			continue
		args = i.split(" ")

		if args[1] == "on":
			print "Brain on"
			awarenessProxy.startAwareness()
		elif args[1] == "off":
			print "Brain off"
			motionProxy.setIdlePostureEnabled("Body", False)
			autonomousProxy.setState("disabled")
			awarenessProxy.stopAwareness()
	elif i.startswith("forward"):
		args = i.split(" ")
		args = args[1:]
		argc = len(args)
		motionProxy.setWalkTargetVelocity(float(args[0]), float(args[1] if argc > 1 else 0), float(args[2] if argc > 2 else 0), float(args[2] if argc > 3 else 0))
	else:
		print "Onbekend commando!"