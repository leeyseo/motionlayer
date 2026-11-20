"""Compatibility entrypoint for the complete browser motion checks."""
import asyncio
from motion_check import main

if __name__ == "__main__":
    asyncio.run(main())
