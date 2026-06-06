---
title: MCP For SME's
description: Why MCP might be the right move for your SME.
date: 2026-06-05
---

What is MCP - Model Context Protocol is an open source standard for connecting AI applications to external systems.

Using MCP, AI applications like Claude or ChatGPT can connect to data sources (e.g. local files, databases), tools (e.g. search engines, CRM’s) and workflows (e.g. specialised prompts or proposal making) - enabling them to access key information and perform tasks.

Think of MCP like a USB port for AI applications. Just as USB provides a standardised way to connect electronic devices, MCP provides a standardised way to connect AI applications to external systems.

Why does this matter? It results in more capable general purpose AI.

Now we can take this USB analogy and run with it. Say, instead of just having a list of tools on this USB, we also put an entire library of information relating to the business. This library contains an ontology of the business ranging from what certain objects mean in your CRM, to where you store, to a glossary explaining what 'MYBA' or 'CA' mean - all with the purpose of helping the agent understand how we do things as a collection of people in the business.

Additionally, we store **Skills** on this USB (MCP). What is a skill? A skill is like a cookbook of how to do something; in essence, it is just a very large prompt that can be reused. 'How to make a multi yacht proposal email' is a prime example of a Skill. This process involves several steps, e.g. understand what the user wants, clone the template, replace images, find brochures… and so on. There are multiple steps that we do not want to have to keep repeating to our general purpose AI! So we put these skills on the MCP. Skills serve a very important function here: without them the agent needs its hand held through every multi step process; with them, it has the confidence to keep going without always asking for more direction.

Now we are in a position where any AI that we provide our MCP to has the knowledge and underlying business processes, has a set of instructions for how to do long running workflows, and has a full toolbox to be able to work across our digital services.

For lots of businesses that’s job done, plug your MCP into Claude and you’re away.

For us we had a slightly different dilemma at hand. We already had a custom agent build with lots of tools, WhatsApp as the interface, and doing a job. Where to go from here? Initially it seemed attractive to just scrap this WhatsApp agent and move directly to a big AI team plan. Everyone gets their own account with the tools all good. Not quite. The WhatsApp agent fundamentally did a good job, it started as a super low friction way of collecting info from other conversations and taking notes. Call it a shared note taking agent that added the notes directly into the CRM on the appropriate contacts. Now this agent could do other things as well but it really shone in how streamlined it was - no faff, no confirmations, just action. So again, where to go? The answer as you may imagine is presented to us by MCP. One server multiple clients. We replace all the tools in the WhatsApp agent with just this MCP server. All the business logic, permissions policies, access control, skills etc… is still centralised. One reusable piece of code. 

Removing all the tools from the WhatsApp agent not only simplified that whole codebase down hugely but also improved the performance. 

So should we use ChatGPT or Claude over our own proprietary agent orchestration? I think not. I think we should use both.

One server, multiple clients. There are still lots of benefits to moving solely onto a Claude Team Plan; less code to maintain, the agent is constantly getting better, file processing, subsidised token costs. However we cannot loose sight of the reason we has a custom agent in the first place, not all these use cases get replaced, but it doesn’t matter! Thanks to MCP we can have both and I would encourage you to have both, 90% of the work and logic lives on the server so adding new clients is pretty straight forwards and may just scratch a particular use case that you want. 

For us it seemed simple in the end, browser based agent for desk based jobs - spreadsheets and data manipulation - mobile based agent for mobile based jobs - contact lookups, note taking.

So what does MCP do for your business?

It provides a single integration layer for AI agents, a centralised knowledge hub that can be used and reused not just across BIG AI platforms but across custom implementations alike. It’s a future proofing step, build once and reuse. AI agents and clients may come and go but your MCP will survive them all hopping from one to the next keeping all that hard work alive.