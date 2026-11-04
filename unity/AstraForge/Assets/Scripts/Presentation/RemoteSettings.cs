using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
namespace AstraForge.Presentation
{
    [Serializable] public sealed class RemoteConfig { public int summonCost,monsterLimit; public double common,rare,heroic,legendary,mythic,waveSeconds,bossSeconds,hpGrowth; }
    [Serializable] public sealed class RemoteEnvelope { public int revision; public RemoteConfig config; }
    public static class RemoteSettings
    {
        public static IEnumerator Fetch(Action<BalanceSettings> complete, Action<string> failed)
        {
            using (var request = UnityWebRequest.Get("https://starseed-guardians-coop-20261022.eogus3535.chatgpt.site/api/astra/config"))
            {
                request.timeout = 10; yield return request.SendWebRequest();
                if (request.result != UnityWebRequest.Result.Success) { failed("Offline default settings: " + request.error); yield break; }
                try { var e = JsonUtility.FromJson<RemoteEnvelope>(request.downloadHandler.text); var c=e.config; complete(new BalanceSettings(e.revision,c.summonCost,c.monsterLimit,c.waveSeconds,c.bossSeconds,c.hpGrowth,new[]{c.common,c.rare,c.heroic,c.legendary,c.mythic})); }
                catch (Exception ex) { failed("Invalid remote settings: " + ex.Message); }
            }
        }
    }
}
