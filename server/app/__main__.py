""" Runs the web server
"""

from . import application

application.run(host='0.0.0.0', port=8080)
