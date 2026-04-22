# Familiar
For MDDN242: a basic template for a familiar that lives in your browser

Idea- make a bird or seagul, could be done in a cool different style, pixel or drawn etc th 

I started by editing how the 'creature' itself looked and then altering its background.
I decided to add a web using p5.js lines but this wasn't as customizable as i wanted. i then decided to use this is a 'pathway' route for the spider with a decorative image overtop

______________
BACKGROUND - TIME & WEATHER - 

SUNRISE: 
(06:00–07:30) Orange-pink (if clear) Muted orange (if cloudy/rainy)
DAY:     
(07:30–17:30) Soft sky blue (if clear) Grey (if cloudy/rainy), darkens as hours pass 
SUNSET:  
(17:30–20:00) Vivid orange to amber (clear) Muted grey-orange (cloudy)
NIGHT:   
(20:00–05:59) Dark navy (clear or cloudy)

with smooth transitions between them, sky will change gradually/more realistically
________________
PROMPTS/AI:

"how can I make 'the need' be fufilled when the user is paying attention to the page but it being calm and quiet, explain simply and briefly"

Claude has been better for more accurate, expansive help but Co-pilot allows me to do more of the work and only provide guidence to help execute my ideas, as I dont understand code or its capabilities well to begin with. I feel more in control of the outcomes when using Co-pilot to help.

______________
-Could be  a calm 'study buddy' as it needs quiet 
-User can help by picking debre out of the web making room for more food (bugs)


___________
EMOTIONS:
Distressed to Calm should take 10-ish seconds of quiet, focused attention
If the user has been away for a long time , the spider becomes “untrusted”
-“Untrusted” sits between distressed and calm
-The more AFK hours, the longer it takes to reach calm

When the user clicks away / tab is not focus
→ spider becomes worried  
→ moves quickly
→ loses trust
→ takes a long time to calm down when the user returns

When the user returns + stays quiet
→ trust slowly rebuilds
→ transitions: worried → untrusted → calm

______________________
17th april:
DO THIS::::
--Time since last visit
--Number of visits
--day of week

make web shape different if havent visited in spaccific number of hours or spasicic weather
maybe make education to a real spiders haits, eg makes stronger web when windy
do whats already been sent, hasnt been added at all, then add afk counter to sidebar that says how many hours uve been away for. plus fix the clouds somehow
__________________


do whats already been sent, hasnt been added at all, then add afk counter to sidebar that says how many hours uve been away for. plus fix the clouds somehow

- they started stacking on the same nodes, so i had to give it a cap make the drop rates more interesting and connected to how the user is interacting with the spider
_________
TO DO:
if you build a really close relationship with the spider it brinsg its family members 
slightly less close or something else dependant it draws different pictures in the web

-if you collect enough debris and put them in ur basket you can gift them ack at a bouquet and the spiderw ill draw u the flower picture the next time u retrun----!!


BOUQUET IDEA:
when the user collects 10 debris of 'debris1.png' and 10 of 'debris2.png' in the 'envelope' (the user will drag and drop the debris over the envelope to 'add them to the envelop') then it will spawn a 'bouquet.png'  ontop of the envelope that you can give to the spider by dragging and dropping the bouquet onto the spider, if the spider trusts you the web will fade transition over 20 seconds to 'web2.png' while the spider does quick circles over the web until its done fading in
_____
to do april 21st : now its too large for the screen size, in relation to desktop screen size can the canvas have the ratio of 9:16 but still fit nicely and easily visible on the page
_______________
when the bouquet is placed on the spider it doesnt begin to go in circles over then web and the web doesnt slowly fade over 20 seconds into 'web2.png'. Can you fix this while also making the bouquet bigger and adding a counter to the sidebar of how many debris are in the envelope
__________
If the user is too loud then spider becomes frustrated for 1 minute.

Each additional loud event or debris‑overrun adds +10 seconds to the frustration duration.

'Calm company' visits reduce the likelihood of frustration (a long‑term bonding mechanic).

A connection bar in the sidebar reflects this long‑term resilience.

The spider becomes less reactive the more positive visits you have.
____________

| State | Visual Cues |
| --- | --- |
| **calm** | soft eyes, slow breathing, gentle bob |
| **untrusted** | slight eye narrowing, slower movement |
| **worried** | wide eyes, fast movement, trembling |
| **frustrated** | narrow eyes, stiff legs, strong shake |
| **distressed** | curled posture, slow rocking |
| **fear** (new) | full curl, tiny eyes, no movement |
| **comfort** (new) | soft bobbing, relaxed legs, half‑closed eyes |