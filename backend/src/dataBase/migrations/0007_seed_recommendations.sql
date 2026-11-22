-- Seed: starter recommendations (paraphrased from public guidance; verify wording before final release).
INSERT INTO "recommendations" ("category","phase","language","title","body","source_org","source_url","position")
SELECT * FROM (VALUES
 ('earthquakes','during','en','Drop, Cover, Hold On','Drop to your hands and knees, cover your head and neck under sturdy furniture, and hold on until the shaking stops. Stay away from windows.','Ready.gov','https://www.ready.gov/earthquakes',1),
 ('earthquakes','after','en','After the shaking','Expect aftershocks. Check for injuries and gas leaks, and use text messages instead of calls. Leave damaged buildings.','Ready.gov','https://www.ready.gov/earthquakes',2),
 ('wildfires','during','en','If a wildfire approaches','Follow evacuation orders immediately. Close windows and doors, wear an N95 mask if you must go outside, and keep your car fueled and facing out.','Ready.gov','https://www.ready.gov/wildfires',1),
 ('wildfires','before','en','Prepare a go-bag','Keep documents, medication, water, a charger and a map of two exit routes ready.','Ready.gov','https://www.ready.gov/wildfires',2),
 ('floods','during','en','Turn around, don''t drown','Move to higher ground. Never walk or drive through floodwater: 15 cm of moving water can knock you down.','Ready.gov','https://www.ready.gov/floods',1),
 ('floods','after','en','After a flood','Avoid floodwater (it can be contaminated), do not use electrical items that got wet, and boil water until authorities say it is safe.','WHO','https://www.who.int/health-topics/floods',2),
 ('severeStorms','during','en','Shelter from the storm','Stay indoors away from windows. Unplug electronics and avoid showers or plumbing during lightning.','Ready.gov','https://www.ready.gov/thunderstorms-lightning',1),
 ('cyclone','during','en','Hurricane / cyclone safety','Follow evacuation orders, stay inside away from windows, and do not go out during the eye of the storm.','Ready.gov','https://www.ready.gov/hurricanes',1),
 ('volcanoes','during','en','Ashfall','Stay indoors, close windows, protect your lungs with an N95 mask, and cover your eyes with goggles if outside.','USGS','https://www.usgs.gov/programs/VHP',1)
) AS v(category,phase,language,title,body,source_org,source_url,position)
WHERE NOT EXISTS (SELECT 1 FROM "recommendations" LIMIT 1);
