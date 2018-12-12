<?php

/**
 * AJAX handler to enrol a single user
 *
 * @package    enrol_payment
 * @copyright  2018 Seth Yoder <seth.a.yoder@gmail.com>
 * @author     Seth Yoder
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(dirname(__FILE__).'/../../../config.php');
require_once("$CFG->libdir/moodlelib.php");
require_once(dirname(__FILE__).'/../lang/en/enrol_payment.php');
require_once(dirname(__FILE__).'/util.php');
require_once(dirname(__FILE__).'/../paymentlib.php');

global $DB;

$prepayToken = required_param('prepaytoken', PARAM_ALPHANUM);

$ret = array();

try {
    $payment = get_payment_from_token($prepayToken);
    update_payment_data(false, null, $payment);
} catch (Exception $e) {
    $ret["success"] = false;
    $ret["failmessage"] = "Payment UUID ".$prepayToken." not found in database.";
}

echo json_encode($ret);
