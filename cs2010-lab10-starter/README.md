# Lab 10 - APIs and Media Generation

**Cleanup**

- Log out of github: `gh auth logout`
- If you used OpenCode, delete the provider: `/connect`, select provider, ctrl+d
- If you have a key in an env var, close the terminal window.
- If you wrote a key to an env file, remove it: `rm openrouter.env`

**Setup**

- Important: Do not commit API keys to your repo on github.
- Log in to github: `gh auth login`
- Create a project directory to work in, either with `mkdir` or in the GUI file
  manager. Work in that directory (either `cd` or in the GUI file manager do
  "Open Terminal Here")
- Make sure some basic tools are installed: `sudo apt install kate jq
python-is-python3`
- Make sure Mise is installed: <https://mise.jdx.dev/>
- Generate an OpenRouter key, limited to 1 day and 2 dollars, and save it here
in a file called `openrouter.env`  containing
`export OPENROUTER_API_KEY=sk-your-key...`

## Part 1: Christmas Song (no OpenCode)

- Start with the provided scripts and generate a Christmas song. Come up with
a better prompt
- Use Qwen-Image 2.1 Turbo to generate an illustration for your song.
- Using the API docs on OpenRouter generate a 5 second video clip to go
with your song (maybe wth hailuo-3-max)

## Part 2: Weather App (with OpenCode)

- Set up OpenCode
- Feed today's lecture notes into it: <https://homework.quest/classes/2026-09/cs2010/notes/11-09-introducing-apis/>
- Generate a express-vite / React app that does the thing:
  - Pulls the current weather.
  - Changes the image to match the time of day, time of year, and forecaseted
  weather

## Submit to Inkfish

- This git repo.
- Including your song mp3, your video mp4, your lyrics, and your app.

**Some Model Links**

- <https://openrouter.ai/qwen/qwen-image-2.1-turbo>
- <https://openrouter.ai/heygen/heygen-video-1>
- <https://openrouter.ai/minimax/hailuo-3-max>
