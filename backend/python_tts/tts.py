# # python_tts/tts.py
# import sys
# import os
# import asyncio
# import pathlib
# import edge_tts
# import time

# async def synthesize(text, out_path):
#     communicate = edge_tts.Communicate(text, "hi-IN-SwaraNeural")
#     await communicate.save(out_path)

# def main():
#     if len(sys.argv) < 2:
#         print("USAGE: python tts.py \"Your text here\"")
#         sys.exit(1)

#     text = " ".join(sys.argv[1:])
#     out_dir = pathlib.Path(__file__).parent.parent / "output"
#     out_dir.mkdir(parents=True, exist_ok=True)

#     # dynamic filename using timestamp
#     timestamp = int(time.time() * 1000)
#     out_path = out_dir / f"output_{timestamp}.mp3"

#     asyncio.run(synthesize(text, str(out_path)))
#     # Print the file path so Node can read stdout
#     print(str(out_path))

# if __name__ == "__main__":
#     main()


#new start here

# python_tts/tts.py
import sys
import os
import asyncio
import pathlib
import edge_tts
import time

async def synthesize(text, out_path):
    # Use female voice for better experience
    communicate = edge_tts.Communicate(text, "hi-IN-SwaraNeural")
    await communicate.save(out_path)

def main():
    if len(sys.argv) < 2:
        print("USAGE: python tts.py \"Your text here\"")
        sys.exit(1)

    text = " ".join(sys.argv[1:])
    # Cross-platform path handling
    base_dir = pathlib.Path(__file__).parent.parent
    out_dir = base_dir / "output"
    out_dir.mkdir(parents=True, exist_ok=True)

    # dynamic filename using timestamp
    timestamp = int(time.time() * 1000)
    out_path = out_dir / f"output_{timestamp}.mp3"

    asyncio.run(synthesize(text, str(out_path)))
    # Print the file path so Node can read stdout
    print(str(out_path))

if __name__ == "__main__":
    main()