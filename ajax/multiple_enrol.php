<?php

require_once('../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once('../lang/en/enrol_ecommerce.php');

global $DB;

function update_ipn_data($userids, $ipn_id) {
    global $DB;
    try {
        $data = [ "id" => $ipn_id
                , "multiple" => true
                , "multiple_userids" => implode(",",$userids)
                ];
        $DB->update_record("enrol_ecommerce_ipn", $data);
    } catch (Exception $e) {
        $ret["success"] = false;
        $ret["failreason"] = "dbupdateerror";
        $ret["failmessage"] = $e->getMessage();
    }
}

function get_moodle_users_by_emails($emails, $ret) {
    global $DB;
    $notfound = array();
    $userids = array();

    foreach($emails as $email) {
        $user = $DB->get_record('user', array('email' => $email), "id, email");
        if(!$user) {
            $ret["success"] = false;
            $ret["failreason"] = "usersnotfoundwithemail";
            array_push($notfound, $email);
        } else {
            array_push($userids, $user->id);
        }

    }

    $ret["userids"] = $userids;

    if (!$ret["success"]) {
        $ret["failmessage"] = get_string("usersnotfoundwithemail", "enrol_ecommerce") . implode("\n- ", $notfound);
    }

    return $ret;
}

$ret = array("success" => true);
$emails = json_decode(stripslashes($_POST['emails']));
$instanceid = $_POST['instanceid'];
$ipn_id = $_POST['ipn_id'];

if ($CFG->allowaccountssameemail) {
    $ret["success"] = false;
    $ret["failreason"] = "allowaccountssameemail";
    $ret["failmessage"] = get_string("sameemailaccountsallowed", "enrol_ecommerce");
    echo json_encode($ret);
} else if (count($emails) != count(array_unique($emails))) {
    $ret["failreason"] = "duplicateemail";
    $ret["failmessage"] = get_string("duplicateemail", "enrol_ecommerce");
    echo json_encode($ret);
} else {
    $ret = get_moodle_users_by_emails($emails, $ret);

    if($ret["success"]) {
        update_ipn_data($ret['userids'], $ipn_id);
    }

    echo json_encode($ret);
}
