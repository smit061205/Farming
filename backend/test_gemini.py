import os
import asyncio
import google.generativeai as genai

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    print("API Key loaded:", bool(api_key))
    if not api_key:
        print("No key")
        return
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    print("Sending request...")
    try:
        # try sync first
        print("Sync...")
        # res = model.generate_content("Say hi")
        # print("Sync success", res.text)
        
        print("Async...")
        res2 = await asyncio.wait_for(model.generate_content_async("Say hi"), timeout=5)
        print("Async success", res2.text)
    except Exception as e:
        print("Error:", e)
        
if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(main())
