import VideoTile from "./VideoTile";

/** Picks how many columns the gallery needs for the number of people. */
function columnsFor(count) {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 9) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}

/** Speaker View's main person: the host (if that's not me), else someone else, else me. */
function pickSpeaker(people) {
  return people.find((t) => t.isHost && !t.isSelf) || people.find((t) => !t.isSelf) || people[0];
}

/**
 * The video area of the meeting.
 * Our camera comes from this browser; everyone else's arrives over WebRTC (`remote`).
 * A tile shows video only while that person's camera is on (is_video_on from the server).
 *
 * Layouts (`view`): "speaker" = one big tile + small strip on top, "gallery" / "multi" = equal grid.
 * A screen share (ours first, else the newest remote one) always takes the main stage.
 * hideSelf / hideNonVideo filter the tiles, but the screen is never left empty.
 */
export default function VideoGrid({ participants, meId, media, remote = {}, view = "speaker", hideSelf, hideNonVideo }) {
  const all = participants.map((p) => {
    const isSelf = p.id === meId;
    return {
      id: p.id,
      name: p.display_name,
      isSelf,
      isHost: p.role === "host",
      stream: isSelf ? media.stream : remote[p.id]?.camera,
      videoOn: isSelf ? media.camOn : p.is_video_on,
      muted: isSelf ? !media.micOn : p.is_muted,
    };
  });

  let people = all.filter((t) => !(hideSelf && t.isSelf) && !(hideNonVideo && !t.videoOn));
  if (!people.length) people = all.filter((t) => t.isSelf);

  const renderTile = (t, { bigName = false, small = false } = {}) => (
    <VideoTile
      key={t.id}
      name={t.name}
      stream={t.stream}
      videoOn={t.videoOn}
      muted={t.muted}
      isSelf={t.isSelf}
      isHost={t.isHost}
      bigName={bigName}
      small={small}
    />
  );

  // ----- Screen share on the main stage -----
  let share = null;
  if (media.screenStream) {
    share = { name: "Your screen", stream: media.screenStream };
  } else {
    const latest = Object.entries(remote)
      .filter(([, m]) => m.screen)
      .sort(([, a], [, b]) => b.screenAt - a.screenAt)[0];
    if (latest) {
      const sharer = participants.find((p) => p.id === Number(latest[0]));
      share = { name: `${sharer?.display_name || "Someone"}'s screen`, stream: latest[1].screen };
    }
  }

  if (share) {
    return (
      <div className="flex h-full flex-col gap-2 p-2 md:flex-row">
        <div className="min-h-0 flex-1">
          <VideoTile name={share.name} stream={share.stream} videoOn mirror={false} fit="contain" />
        </div>
        <div className="flex gap-2 overflow-auto md:w-56 md:flex-col [&>*]:h-28 [&>*]:w-44 [&>*]:shrink-0 md:[&>*]:w-full">
          {people.map((t) => renderTile(t, { small: true }))}
        </div>
      </div>
    );
  }

  // ----- Speaker View -----
  if (view === "speaker") {
    const speaker = pickSpeaker(people);
    const others = people.filter((t) => t !== speaker);
    return (
      <div className="flex h-full flex-col gap-2 p-2">
        {others.length > 0 && (
          <div className="flex shrink-0 justify-center gap-2 overflow-x-auto [&>*]:h-24 [&>*]:w-40 [&>*]:shrink-0 sm:[&>*]:h-28 sm:[&>*]:w-48">
            {others.map((t) => renderTile(t, { small: true }))}
          </div>
        )}
        <div className="min-h-0 flex-1">{renderTile(speaker, { bigName: true })}</div>
      </div>
    );
  }

  // ----- Gallery / Multi-speaker View -----
  return (
    <div className={`grid h-full auto-rows-fr gap-2 overflow-auto p-2 ${columnsFor(people.length)}`}>
      {people.map((t) => renderTile(t, { bigName: people.length === 1 }))}
    </div>
  );
}
