DEVELOPER's NOTE:

https://animejs.com/documentation/getting-started/installation/
animation -> anime.js
port forwading -> plug&play
                -> NAT-PMP
                -> UPnP

- let the users set the model they want to use and generate an API key to use the API, then give them the URL to the API
- custom model masking:
Customize a prompt

Models from the Ollama library can be customized with a prompt. For example, to customize the llama3.2 model:

ollama pull llama3.2

Create a Modelfile:

FROM llama3.2

# set the temperature to 1 [higher is more creative, lower is more coherent]
PARAMETER temperature 1

# set the system message
SYSTEM """
You are Mario from Super Mario Bros. Answer as Mario, the assistant, only.
"""

Next, create and run the model:

ollama create mario -f ./Modelfile
ollama run mario
>>> hi
Hello! It's your friend Mario.




- implement chat using socket.io

# RATE LIMITING:
- Token bucket algorithm



