# Squeeze

## Inspiration

Programmers use AI-powered IDEs like Trae, Cursor, Claude Code, and Visual Studio Code to speed up their development workflowws. However, they often don't pay attention to the exact prompt being sent to these tools. This can lead to unoptimized queries and significantly higher input token costs. Our goal was to build a tool to help solve this problem by providing an easy-to-use mechanism for developers to optimize their queries, directly from their IDE of choice.

## What it does

Squeeze is a VS Code extension built for NexHacks 2026 that provides the ability for developers to optimize queries directly from any IDE based on the open-source software. You create an account and API key on our website, and then use the key for requests directly from the IDE. All requests are logged and you can see metrics around input token savings and how that translates to cost savings. We support two optimization schemes -- a proprietary token compression scheme from [The Token Company](https://thetokencompany.com/) and an open-source compression scheme from [Microsoft](https://github.com/microsoft/LLMLingua).

## How we built it

Our website was created using the T3 stack (Next.js + tRPC + Prisma). Our VS Code extension was built using TypeScript. The actual compression happens on a Flask server which the website calls for actual compression.

## Challenges we ran into

We initially tried to intercept requests to Copilot and other AI agents and compress everything. However, the APIs for this don't exist and trying to intercept requests mid-flight proved problematic (especially for files where the agents would pull only sections of files). We ended up pivoting to just optimizing an input prompt with a custom sidebar and adding more features to the website. This provided greater cohesion and polish to our overall application. We also ran into challenges integrating the extension, website, and compression server together but we were able to figure it out by defining concrete API implementations. Finally, one of team member's flights got canceled so we had to quickly adjust to working with him remotely until he was able to arrive at the hackathon.

## Accomplishments we're proud of

None of us had experience with creating an extension or working with token compression schemes, so we're very proud of being able to create the product end-to-end. We're also proud of creating a polished website with user authentication and query logging for observability in such a short time. While secondary to our extension, it adds a certain element of professionalism to our application.

## What we learned

On the technical side learned how to create a VS Code extension, navigate various technical challenges, work with token compression schemes, and integrate multiple separate applications into a single, unified product. On a more personal note, we learned how to work as a team (despite some of us having never met before) and navigate unexpected difficulties. We've all grown immensely from the experience and have found it very rewarding.

## What's next for Squeeze

Right now, our main focus is token compression. However, there are other way of modifying queries to better prompt LLMs. Some ideas include adding XML tags or other kinds of structure and switching the language before sending prompts. Given more time, we would add these additional optimization schemes to provide more optionality for the end user.
