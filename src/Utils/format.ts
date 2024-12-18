import moment from "moment"
export const formatDate = (text: string) => {
    const formattedDate = moment(text, "DD MMM 'YY HH:mm").format("DD MMM YY");
    return formattedDate;
}