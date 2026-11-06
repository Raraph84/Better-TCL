export const parseISO8601Duration = (duration: string) => {
    const matches = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) throw new Error("Invalid ISO 8601 duration format: " + duration);
    return parseInt(matches[1] || "0") * 60 + parseInt(matches[2] || "0");
};

export const toDate = (d: string): Date =>
    new Date(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8)));

export const toDateTime = (date: Date, t: string): Date =>
    new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        Number(t.slice(0, 2)),
        Number(t.slice(3, 5)),
        Number(t.slice(6, 8))
    );
